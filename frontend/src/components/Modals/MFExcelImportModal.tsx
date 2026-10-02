import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { MFHolding, MFTransaction } from '../../types';

// Flexible column aliases (all lowercase)
const ALIASES: Record<string, string[]> = {
  schemeCode: ['scheme_code', 'schemecode', 'code', 'amfi_code', 'amfi', 'scheme', 'fund_code', 'isin'],
  fundName:   ['fund_name', 'fundname', 'fund', 'scheme_name', 'schemename', 'name', 'mutual_fund'],
  amcName:    ['amc_name', 'amcname', 'amc', 'asset_management', 'fund_house'],
  type:       ['type', 'action', 'transaction', 'transaction_type', 'buy_sell'],
  units:      ['units', 'unit', 'quantity', 'qty', 'no_of_units'],
  nav:        ['nav', 'price', 'rate', 'unit_nav', 'nav_price'],
  amount:     ['amount', 'amt', 'invest', 'investment', 'value'],
  date:       ['date', 'trade_date', 'transaction_date', 'purchase_date', 'buy_date'],
  notes:      ['notes', 'note', 'remarks', 'comment', 'description'],
};

function detectColumn(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const lower = h.toLowerCase().replace(/\s+/g, '_');
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (!(field in map) && aliases.some(a => lower.includes(a))) {
        map[field] = i;
      }
    }
  });
  return map;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

interface ParsedMFRow {
  index: number;
  raw: unknown[];
  errors: string[];
  schemeCode: string;
  fundName: string;
  amcName: string;
  type: 'buy' | 'sell';
  units: number;
  nav: number;
  amount: number;
  date: string;
  notes: string;
}

function parseRow(row: unknown[], colMap: Record<string, number>, index: number): { parsed: ParsedMFRow; errors: string[] } {
  const get = (field: string) => colMap[field] !== undefined ? row[colMap[field]] : undefined;
  const errors: string[] = [];

  const schemeCode = String(get('schemeCode') ?? '').trim();
  const fundName   = String(get('fundName')   ?? '').trim();

  if (!schemeCode && !fundName) {
    errors.push('Scheme Code or Fund Name is required');
  }

  const rawType = String(get('type') ?? '').trim().toLowerCase();
  const type = rawType === 'b' ? 'buy' : rawType === 's' ? 'sell' : rawType as 'buy' | 'sell';
  if (type !== 'buy' && type !== 'sell') errors.push(`Type must be buy or sell (got "${rawType}")`);

  const units = parseFloat(String(get('units') ?? ''));
  if (isNaN(units) || units <= 0) errors.push('Units must be a positive number');

  const nav = parseFloat(String(get('nav') ?? ''));
  if (isNaN(nav) || nav < 0) errors.push('NAV must be a non-negative number');

  // Amount is optional — derive from units × nav if missing
  const rawAmt = parseFloat(String(get('amount') ?? ''));
  const amount = !isNaN(rawAmt) && rawAmt > 0 ? rawAmt : (isNaN(units) || isNaN(nav) ? 0 : parseFloat((units * nav).toFixed(2)));

  const date = parseDate(get('date'));
  if (!date) errors.push('Invalid date (use YYYY-MM-DD or DD/MM/YYYY)');

  const notes   = String(get('notes') ?? '').trim();
  const amcName = String(get('amcName') ?? '').trim();

  return {
    parsed: {
      index,
      raw: row,
      errors,
      schemeCode,
      fundName,
      amcName,
      type: type as 'buy' | 'sell',
      units: isNaN(units) ? 0 : units,
      nav:   isNaN(nav)   ? 0 : nav,
      amount,
      date:  date ?? '',
      notes,
    },
    errors,
  };
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = ['Scheme Code', 'Fund Name', 'AMC Name', 'Type', 'Units', 'NAV', 'Amount', 'Date', 'Notes'];
  const sample = [
    ['119598', 'Mirae Asset Large Cap Fund - Direct - Growth', 'Mirae Asset', 'buy', 10.234, 98.5432, 1008.26, '2024-01-15', 'First SIP'],
    ['119598', 'Mirae Asset Large Cap Fund - Direct - Growth', 'Mirae Asset', 'buy', 9.876,  101.23,  1000,    '2024-02-15', ''],
    ['120503', 'Axis Small Cap Fund - Direct - Growth',        'Axis MF',     'buy', 25.000, 82.50,   2062.50, '2024-03-01', ''],
    ['120503', 'Axis Small Cap Fund - Direct - Growth',        'Axis MF',     'sell', 10.000, 90.00,  900.00,  '2024-06-10', 'Partial redemption'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws['!cols'] = [14, 46, 18, 8, 10, 12, 10, 12, 22].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'MF Transactions');

  const instrData = [
    ['Field',       'Required',  'Notes'],
    ['Scheme Code', 'Yes*',      'AMFI scheme code (e.g. 119598). Get from amfiindia.com or use the Add Fund search.'],
    ['Fund Name',   'Yes*',      'Full fund name. Required if Scheme Code is blank.'],
    ['AMC Name',    'No',        'Optional. Auto-populated from live data.'],
    ['Type',        'Yes',       'buy or sell'],
    ['Units',       'Yes',       'Number of units (e.g. 10.234)'],
    ['NAV',         'Yes',       'NAV per unit on transaction date'],
    ['Amount',      'No',        'Total amount. If blank, calculated as Units × NAV.'],
    ['Date',        'Yes',       'YYYY-MM-DD or DD/MM/YYYY'],
    ['Notes',       'No',        'Optional remarks'],
    [''],
    ['* At least one of Scheme Code or Fund Name must be provided.'],
    ['  If both are given, Scheme Code takes precedence for matching existing holdings.'],
    ['  New holdings are created automatically for scheme codes not yet in your portfolio.'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instrData);
  ws2['!cols'] = [14, 10, 56].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

  XLSX.writeFile(wb, 'mf_transactions_template.xlsx');
}

interface Props {
  holdings: MFHolding[];
  onImport: (updatedHoldings: MFHolding[]) => void;
  onClose: () => void;
}

export default function MFExcelImportModal({ holdings, onImport, onClose }: Props) {
  const [step, setStep]           = useState<'upload' | 'preview' | 'done'>('upload');
  const [dragging, setDragging]   = useState(false);
  const [fileName, setFileName]   = useState('');
  const [rows, setRows]           = useState<ParsedMFRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported]   = useState(0);
  const [newFunds, setNewFunds]   = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
      if (raw.length < 2) return;

      const headers = (raw[0] as unknown[]).map(h => String(h));
      const colMap = detectColumn(headers);

      const parsed: ParsedMFRow[] = (raw.slice(1) as unknown[][])
        .filter(r => r.some(c => c !== '' && c !== null && c !== undefined))
        .map((r, i) => {
          const { parsed } = parseRow(r, colMap, i + 2);
          return parsed;
        });

      setRows(parsed);
      setStep('preview');
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const validRows   = rows.filter(r => r.errors.length === 0);
  const invalidRows = rows.filter(r => r.errors.length > 0);

  // Preview: count new vs existing funds
  const fundCounts = (() => {
    const codes = new Set(validRows.map(r => r.schemeCode || r.fundName));
    let newCount = 0;
    codes.forEach(key => {
      const exists = holdings.some(h => h.schemeCode === key || h.fundName === key);
      if (!exists) newCount++;
    });
    return { total: codes.size, newCount, existingCount: codes.size - newCount };
  })();

  const handleImport = () => {
    setImporting(true);

    // Start with a deep copy of current holdings
    const updatedMap = new Map<string, MFHolding>();
    holdings.forEach(h => updatedMap.set(h.schemeCode || h.fundName, { ...h, transactions: [...h.transactions] }));

    let createdFunds = 0;

    validRows.forEach(row => {
      const key = row.schemeCode || row.fundName;
      if (!key) return;

      // Find or create holding
      if (!updatedMap.has(key)) {
        const newHolding: MFHolding = {
          id:          `mf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          schemeCode:  row.schemeCode,
          fundName:    row.fundName || row.schemeCode,
          amcName:     row.amcName || undefined,
          transactions: [],
        };
        updatedMap.set(key, newHolding);
        createdFunds++;
      }

      const holding = updatedMap.get(key)!;

      // Guard against duplicate import: skip if same (date, units, nav, type) already exists
      const isDuplicate = holding.transactions.some(
        t => t.date === row.date && t.type === row.type &&
             Math.abs(t.units - row.units) < 0.001 && Math.abs(t.nav - row.nav) < 0.0001
      );
      if (isDuplicate) return;

      const tx: MFTransaction = {
        id:     `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type:   row.type,
        date:   row.date,
        units:  parseFloat(row.units.toFixed(3)),
        nav:    parseFloat(row.nav.toFixed(4)),
        amount: parseFloat(row.amount.toFixed(2)),
        notes:  row.notes || undefined,
      };
      holding.transactions.push(tx);
    });

    const updatedHoldings = Array.from(updatedMap.values());
    onImport(updatedHoldings);
    setImported(validRows.length);
    setNewFunds(createdFunds);
    setStep('done');
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-1.5 rounded-lg">
              <FileSpreadsheet className="text-indigo-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Import MF Transactions from Excel</h2>
              {fileName && <p className="text-xs text-gray-400">{fileName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* STEP: Upload */}
          {step === 'upload' && (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">Drop your Excel file here</p>
                <p className="text-sm text-gray-400 mt-1">or click to browse · .xlsx, .xls, .csv supported</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} className="hidden" />
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-indigo-800">Need a template?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Download with sample data and instructions on the second sheet.</p>
                </div>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expected Columns</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { col: 'Scheme Code', req: true,  eg: '119598 (AMFI code)' },
                    { col: 'Fund Name',   req: true,  eg: 'Mirae Asset Large Cap…' },
                    { col: 'AMC Name',    req: false, eg: 'Mirae Asset (optional)' },
                    { col: 'Type',        req: true,  eg: 'buy or sell' },
                    { col: 'Units',       req: true,  eg: '10.234' },
                    { col: 'NAV',         req: true,  eg: '98.5432' },
                    { col: 'Amount',      req: false, eg: 'defaults to Units × NAV' },
                    { col: 'Date',        req: true,  eg: '2024-01-15 or 15/01/2024' },
                    { col: 'Notes',       req: false, eg: 'SIP, redemption, etc.' },
                  ].map(f => (
                    <div key={f.col} className="flex items-start gap-1.5">
                      <span className={`mt-0.5 text-[10px] font-bold px-1 rounded ${f.req ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                        {f.req ? 'REQ' : 'OPT'}
                      </span>
                      <span><strong>{f.col}</strong> — <span className="text-gray-400">{f.eg}</span></span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 italic">
                  * Scheme Code or Fund Name must be provided. New funds are created automatically.
                </p>
              </div>
            </>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && (
            <>
              {/* Summary pills */}
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-600">
                  Total rows: {rows.length}
                </div>
                <div className="flex items-center gap-1.5 bg-green-100 rounded-full px-3 py-1.5 text-xs font-semibold text-green-700">
                  <CheckCircle className="w-3.5 h-3.5" /> Valid: {validRows.length}
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-100 rounded-full px-3 py-1.5 text-xs font-semibold text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5" /> Errors: {invalidRows.length}
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-blue-100 rounded-full px-3 py-1.5 text-xs font-semibold text-blue-700">
                  Buys: {validRows.filter(r => r.type === 'buy').length} · Sells: {validRows.filter(r => r.type === 'sell').length}
                </div>
                {fundCounts.newCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-100 rounded-full px-3 py-1.5 text-xs font-semibold text-amber-700">
                    {fundCounts.newCount} new fund{fundCounts.newCount !== 1 ? 's' : ''} will be created
                  </div>
                )}
                {fundCounts.existingCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-indigo-100 rounded-full px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    {fundCounts.existingCount} existing fund{fundCounts.existingCount !== 1 ? 's' : ''} updated
                  </div>
                )}
              </div>

              {/* Valid rows preview */}
              {validRows.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Preview — Valid Rows ({validRows.length})
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-72">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {['Row', 'Scheme Code', 'Fund Name', 'Type', 'Units', 'NAV', 'Amount', 'Date', 'Notes'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {validRows.map(r => {
                          const isNew = !holdings.some(h => h.schemeCode === (r.schemeCode || r.fundName) || h.fundName === (r.schemeCode || r.fundName));
                          return (
                            <tr key={r.index} className="hover:bg-gray-50">
                              <td className="px-3 py-1.5 text-gray-400">{r.index}</td>
                              <td className="px-3 py-1.5 font-mono text-indigo-700">
                                {r.schemeCode || <span className="text-gray-400">—</span>}
                                {isNew && <span className="ml-1 text-[9px] font-bold bg-amber-100 text-amber-600 px-1 rounded">NEW</span>}
                              </td>
                              <td className="px-3 py-1.5 text-gray-700 max-w-[160px] truncate" title={r.fundName}>{r.fundName || '—'}</td>
                              <td className="px-3 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {r.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-3 py-1.5">{r.units.toFixed(3)}</td>
                              <td className="px-3 py-1.5">₹{r.nav.toFixed(4)}</td>
                              <td className="px-3 py-1.5 font-semibold text-gray-700">₹{r.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                              <td className="px-3 py-1.5 text-gray-500">{r.date}</td>
                              <td className="px-3 py-1.5 text-gray-400 italic max-w-[100px] truncate">{r.notes || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Error rows */}
              {invalidRows.length > 0 && (
                <div>
                  <button onClick={() => setShowErrors(!showErrors)}
                    className="flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-700">
                    {showErrors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {invalidRows.length} rows with errors (will be skipped)
                  </button>
                  {showErrors && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {invalidRows.map(r => (
                        <div key={r.index} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs">
                          <p className="font-semibold text-red-700">Row {r.index}</p>
                          <ul className="mt-1 space-y-0.5 text-red-600 list-disc list-inside">
                            {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {validRows.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-300" />
                  <p className="font-medium text-red-500">No valid rows to import</p>
                  <p className="text-sm mt-1">Fix the errors above and re-upload your file.</p>
                </div>
              )}
            </>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="text-center py-10">
              <CheckCircle className="w-14 h-14 mx-auto mb-4 text-green-500" />
              <p className="text-xl font-bold text-gray-800">Import Complete!</p>
              <p className="text-gray-500 mt-2">{imported} transaction{imported !== 1 ? 's' : ''} imported successfully.</p>
              {newFunds > 0 && (
                <p className="text-sm text-indigo-600 mt-1">{newFunds} new fund{newFunds !== 1 ? 's' : ''} added to your portfolio.</p>
              )}
              {invalidRows.length > 0 && (
                <p className="text-xs text-amber-600 mt-2">{invalidRows.length} rows had errors and were skipped.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3">
          {step === 'upload' && (
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Cancel
            </button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                ← Re-upload
              </button>
              <button onClick={handleImport} disabled={validRows.length === 0 || importing}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg font-medium text-sm transition-colors">
                {importing ? 'Importing…' : `Import ${validRows.length} Transaction${validRows.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
