import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { Currency, DematAccount, TransactionType } from '../../types';

const CURRENCIES: Currency[] = ['INR', 'USD'];
const TYPES: TransactionType[]       = ['buy', 'sell'];

// Flexible column name aliases (all lowercase)
const ALIASES: Record<string, string[]> = {
  symbol:       ['symbol', 'ticker', 'stock', 'scrip', 'script'],
  type:         ['type', 'action', 'transaction', 'transaction_type', 'buy_sell'],
  quantity:     ['quantity', 'qty', 'shares', 'units', 'no_of_shares', 'nos'],
  price:        ['price', 'rate', 'buy_price', 'sell_price', 'cost', 'unit_price', 'nav'],
  fees:         ['fees', 'fee', 'commission', 'brokerage', 'charges', 'tax', 'expense'],
  currency:     ['currency', 'cur', 'ccy', 'currency_type'],
  dematAccount: ['demat', 'account', 'demat_account', 'portfolio', 'broker', 'holder', 'owner'],
  date:         ['date', 'trade_date', 'transaction_date', 'purchase_date', 'buy_date', 'sell_date'],
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
  // Excel serial number
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  // mm/dd/yyyy
  const mdy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    const year = mdy[3].length === 2 ? '20' + mdy[3] : mdy[3];
    return `${year}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseRow(row: unknown[], colMap: Record<string, number>, dematAccounts: string[]): { data: Record<string, string | number | null>; errors: string[] } {
  const get = (field: string) => colMap[field] !== undefined ? row[colMap[field]] : undefined;
  const errors: string[] = [];

  const symbol = String(get('symbol') ?? '').trim().toUpperCase();
  if (!symbol) errors.push('Symbol is required');

  const rawType = String(get('type') ?? '').trim().toLowerCase();
  const type = rawType === 'b' ? 'buy' : rawType === 's' ? 'sell' : rawType as TransactionType;
  if (!TYPES.includes(type as TransactionType)) errors.push(`Type must be buy or sell (got "${rawType}")`);

  const quantity = parseFloat(String(get('quantity') ?? ''));
  if (isNaN(quantity) || quantity <= 0) errors.push('Quantity must be a positive number');

  const price = parseFloat(String(get('price') ?? ''));
  if (isNaN(price) || price < 0) errors.push('Price must be a non-negative number');

  const fees = parseFloat(String(get('fees') ?? '0')) || 0;

  const rawCur = String(get('currency') ?? 'USD').trim().toUpperCase();
  const currency = CURRENCIES.find(c => c === rawCur) ?? null;
  if (!currency) errors.push(`Currency must be INR or USD (got "${rawCur}")`);

  const rawDemat = String(get('dematAccount') ?? (dematAccounts[0] ?? '')).trim();
  const dematAccount = dematAccounts.find(d => d.toLowerCase() === rawDemat.toLowerCase()) ?? null;
  if (!dematAccount) errors.push(`Demat account must be one of: ${dematAccounts.join(', ')} (got "${rawDemat}")`);

  const date = parseDate(get('date'));
  if (!date) errors.push('Invalid date format (use YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY)');

  return {
    data: { symbol, type, quantity, price, fees, currency, dematAccount, date },
    errors,
  };
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = ['Symbol', 'Type', 'Quantity', 'Price', 'Fees', 'Currency', 'Demat Account', 'Date'];
  const sample = [
    ['AAPL',         'buy',  10, 185.50, 5.00, 'USD', 'Narendra', '2024-01-15'],
    ['MSFT',         'buy',  5,  410.00, 5.00, 'USD', 'Rohini',   '2024-02-20'],
    ['AAPL',         'sell', 5,  195.00, 5.00, 'USD', 'Narendra', '2024-06-01'],
    ['RELIANCE.NS',  'buy',  20, 2500.00, 25.00, 'INR', 'Sreenu', '2024-03-10'],
    ['TCS.NS',       'buy',  3,  3800.00, 20.00, 'INR', 'Dad',    '2024-04-05'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws['!cols'] = [12, 8, 10, 10, 8, 10, 14, 12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  // Instructions sheet
  const instrData = [
    ['Field',         'Required', 'Valid Values / Format'],
    ['Symbol',        'Yes',      'e.g. AAPL, RELIANCE.NS, TCS.BO'],
    ['Type',          'Yes',      'buy or sell'],
    ['Quantity',      'Yes',      'Positive number'],
    ['Price',         'Yes',      'Price per share (0 or positive)'],
    ['Fees',          'No',       'Brokerage/commission (default 0)'],
    ['Currency',      'Yes',      'INR or USD'],
    ['Demat Account', 'Yes',      'Narendra, Rohini, Sreenu, or Dad'],
    ['Date',          'Yes',      'YYYY-MM-DD or DD/MM/YYYY'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instrData);
  ws2['!cols'] = [16, 10, 36].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

  XLSX.writeFile(wb, 'transactions_template.xlsx');
}

interface ParsedRow { raw: unknown[]; data: Record<string, string | number | null>; errors: string[]; index: number; }

interface Props { onClose: () => void; }

export default function ExcelImportModal({ onClose }: Props) {
  const { bulkAddBuy, addSell } = usePortfolio();
  const { config } = useAppConfig();
  const dematAccounts = config.dematAccounts;
  const [step, setStep]           = useState<'upload' | 'preview' | 'done'>('upload');
  const [dragging, setDragging]   = useState(false);
  const [fileName, setFileName]   = useState('');
  const [rows, setRows]           = useState<ParsedRow[]>([]);
  const [colMap, setColMap]       = useState<Record<string, number>>({});
  const [importing, setImporting] = useState(false);
  const [imported, setImported]   = useState(0);
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
      const map = detectColumn(headers);
      setColMap(map);

      const parsed: ParsedRow[] = (raw.slice(1) as unknown[][])
        .filter(r => r.some(c => c !== '' && c !== null && c !== undefined))
        .map((r, i) => {
          const { data, errors } = parseRow(r, map, dematAccounts);
          return { raw: r, data, errors, index: i + 2 };
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

  const handleImport = () => {
    setImporting(true);
    const buys  = validRows.filter(r => r.data.type === 'buy');
    const sells = validRows.filter(r => r.data.type === 'sell');

    bulkAddBuy(buys.map(r => ({
      symbol:       String(r.data.symbol),
      quantity:     Number(r.data.quantity),
      price:        Number(r.data.price),
      fees:         Number(r.data.fees ?? 0),
      currency:     r.data.currency as Currency,
      dematAccount: r.data.dematAccount as DematAccount,
      date:         String(r.data.date),
    })));

    sells.forEach(r => addSell({
      symbol:       String(r.data.symbol),
      quantity:     Number(r.data.quantity),
      price:        Number(r.data.price),
      fees:         Number(r.data.fees ?? 0),
      currency:     r.data.currency as Currency,
      dematAccount: r.data.dematAccount as DematAccount,
    }));

    setImported(validRows.length);
    setStep('done');
    setImporting(false);
  };

  const missingCols = Object.keys(ALIASES).filter(f => f !== 'fees' && !(f in colMap));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-1.5 rounded-lg">
              <FileSpreadsheet className="text-green-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Import Transactions from Excel</h2>
              {fileName && <p className="text-xs text-gray-400">{fileName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* STEP: Upload */}
          {step === 'upload' && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">Drop your Excel file here</p>
                <p className="text-sm text-gray-400 mt-1">or click to browse · .xlsx, .xls, .csv supported</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} className="hidden" />
              </div>

              {/* Template download */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">Need a template?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Download the Excel template with sample data and instructions on the second sheet.</p>
                </div>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
              </div>

              {/* Expected columns */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expected Columns</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { col: 'Symbol',        req: true,  eg: 'AAPL, RELIANCE.NS' },
                    { col: 'Type',          req: true,  eg: 'buy or sell' },
                    { col: 'Quantity',      req: true,  eg: '10' },
                    { col: 'Price',         req: true,  eg: '185.50' },
                    { col: 'Fees',          req: false, eg: '5.00 (default: 0)' },
                    { col: 'Currency',      req: true,  eg: 'INR or USD' },
                    { col: 'Demat Account', req: true,  eg: 'Narendra, Rohini, Sreenu, Dad' },
                    { col: 'Date',          req: true,  eg: '2024-01-15 or 15/01/2024' },
                  ].map(f => (
                    <div key={f.col} className="flex items-start gap-1.5">
                      <span className={`mt-0.5 text-[10px] font-bold px-1 rounded ${f.req ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                        {f.req ? 'REQ' : 'OPT'}
                      </span>
                      <span><strong>{f.col}</strong> — <span className="text-gray-400">{f.eg}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && (
            <>
              {/* Column detection result */}
              {missingCols.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-700">Could not auto-detect columns: {missingCols.join(', ')}</p>
                    <p className="text-amber-600 text-xs mt-0.5">Make sure your Excel headers match the expected names.</p>
                  </div>
                </div>
              )}

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
                  Buys: {validRows.filter(r => r.data.type === 'buy').length} · Sells: {validRows.filter(r => r.data.type === 'sell').length}
                </div>
              </div>

              {/* Valid rows preview */}
              {validRows.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview — Valid Rows ({validRows.length})</p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-64">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {['Row', 'Symbol', 'Type', 'Qty', 'Price', 'Fees', 'Currency', 'Demat', 'Date'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {validRows.map(r => (
                          <tr key={r.index} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-gray-400">{r.index}</td>
                            <td className="px-3 py-1.5 font-mono font-semibold text-blue-700">{String(r.data.symbol)}</td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.data.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {String(r.data.type).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">{r.data.quantity}</td>
                            <td className="px-3 py-1.5">{r.data.price}</td>
                            <td className="px-3 py-1.5 text-gray-400">{r.data.fees || '—'}</td>
                            <td className="px-3 py-1.5">{String(r.data.currency)}</td>
                            <td className="px-3 py-1.5">{String(r.data.dematAccount)}</td>
                            <td className="px-3 py-1.5 text-gray-500">{String(r.data.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Error rows (collapsible) */}
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
              <p className="text-gray-500 mt-2">{imported} transactions imported successfully.</p>
              {invalidRows.length > 0 && (
                <p className="text-xs text-amber-600 mt-2">{invalidRows.length} rows had errors and were skipped.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
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
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg font-medium text-sm transition-colors">
                {importing ? 'Importing…' : `Import ${validRows.length} Transactions`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
