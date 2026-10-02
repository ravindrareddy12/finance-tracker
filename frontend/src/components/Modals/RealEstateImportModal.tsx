import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Currency, RealEstateProperty } from '../../types';

const CURRENCIES: Currency[] = ['INR', 'USD'];

// Flexible column aliases (lowercase)
const ALIASES: Record<string, string[]> = {
  propertyName:        ['property_name', 'property', 'name', 'project', 'flat', 'house', 'land'],
  propertyPrice:       ['property_price', 'price', 'total_price', 'cost', 'value', 'amount'],
  mySharePercent:      ['my_share', 'share', 'share_percent', 'my_share_percent', 'ownership', 'stake', 'percent', '%'],
  appreciationPerYear: ['appreciation', 'appreciation_per_year', 'appr', 'growth', 'yield', 'appreciation_percent', 'appr_percent'],
  purchaseDate:        ['purchase_date', 'date', 'buy_date', 'acquired_date', 'investment_date'],
  currency:            ['currency', 'cur', 'ccy'],
  partner:             ['partner', 'co_owner', 'co_investor', 'joint', 'partner_name'],
  amountNotes:         ['amount_notes', 'notes', 'remarks', 'amount_remarks', 'calculation_notes'],
  details1:            ['details1', 'detail1', 'details_1', 'detail_1', 'info1', 'location'],
  details2:            ['details2', 'detail2', 'details_2', 'detail_2', 'info2', 'area'],
  details3:            ['details3', 'detail3', 'details_3', 'detail_3', 'info3', 'registry'],
  status:              ['status', 'state', 'active_sold'],
};

function detectColumn(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim().replace(/\s+/g, '_');
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (!(field in map) && aliases.some(a => lower === a || lower.includes(a))) {
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

function parseRow(row: unknown[], colMap: Record<string, number>): { data: Partial<RealEstateProperty>; errors: string[] } {
  const get = (field: string) => colMap[field] !== undefined ? row[colMap[field]] : undefined;
  const errors: string[] = [];

  const propertyName = String(get('propertyName') ?? '').trim();
  if (!propertyName) errors.push('Property Name is required');

  const propertyPrice = parseFloat(String(get('propertyPrice') ?? ''));
  if (isNaN(propertyPrice) || propertyPrice <= 0) errors.push('Property Price must be a positive number');

  const mySharePercent = parseFloat(String(get('mySharePercent') ?? '100')) || 100;
  if (mySharePercent <= 0 || mySharePercent > 100) errors.push('My Share % must be between 1 and 100');

  const appreciationRaw = get('appreciationPerYear');
  const appreciationPerYear = appreciationRaw !== undefined && String(appreciationRaw).trim() !== ''
    ? parseFloat(String(appreciationRaw))
    : 0;

  const purchaseDate = parseDate(get('purchaseDate'));
  if (!purchaseDate) errors.push('Purchase Date is required (use YYYY-MM-DD or DD/MM/YYYY)');

  const rawCur = String(get('currency') ?? 'INR').trim().toUpperCase();
  const currency = CURRENCIES.find(c => c === rawCur) ?? null;
  if (!currency) errors.push(`Currency must be INR or USD (got "${rawCur}")`);

  const rawStatus = String(get('status') ?? 'active').trim().toLowerCase();
  const status: 'active' | 'sold' = rawStatus === 'sold' ? 'sold' : 'active';

  const partner     = String(get('partner')     ?? '').trim() || undefined;
  const amountNotes = String(get('amountNotes') ?? '').trim() || undefined;
  const details1    = String(get('details1')    ?? '').trim() || undefined;
  const details2    = String(get('details2')    ?? '').trim() || undefined;
  const details3    = String(get('details3')    ?? '').trim() || undefined;

  return {
    data: {
      propertyName, propertyPrice, mySharePercent,
      appreciationPerYear: isNaN(appreciationPerYear) ? 0 : appreciationPerYear,
      purchaseDate: purchaseDate ?? '',
      currency: currency ?? 'INR',
      partner, amountNotes, details1, details2, details3,
      status, returns: [],
    } as Partial<RealEstateProperty>,
    errors,
  };
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = [
    'Property Name', 'Property Price', 'My Share %', 'Appreciation Per Year %',
    'Purchase Date', 'Currency', 'Partner', 'Amount Notes', 'Details 1', 'Details 2', 'Details 3', 'Status',
  ];
  const sample = [
    ['Green Valley Flat 4B', 5000000, 100, 8, '2022-06-15', 'INR', '',          'Registry + stamp duty',    'Flat No 4B, Block C', '1200 sq.ft',   'Reg No: HYD/2022/001', 'active'],
    ['Sunrise Villa',         8000000,  50, 7, '2021-03-10', 'INR', 'Rohini',    'Joint with Rohini 50-50',  'Plot 12, Phase 2',    '2400 sq.ft',   '',                     'active'],
    ['US Condo Miami',         250000, 100, 5, '2023-01-20', 'USD', '',          '',                          'Unit 302, Tower A',   '950 sq.ft',    '',                     'active'],
    ['Old Plot Secunderabad',  2000000, 100, 6, '2015-08-01', 'INR', '',          '',                          'Survey No 45',        '1000 sq.yd',   '',                     'sold'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws['!cols'] = [22, 14, 10, 20, 14, 10, 12, 22, 20, 14, 18, 8].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Real Estate');

  const instrData = [
    ['Field',                    'Required', 'Valid Values / Format'],
    ['Property Name',            'Yes',      'Any text — name of property'],
    ['Property Price',           'Yes',      'Total property price (positive number)'],
    ['My Share %',               'No',       '1–100 (default: 100 = fully owned)'],
    ['Appreciation Per Year %',  'No',       'Annual appreciation rate e.g. 8 (default: 0)'],
    ['Purchase Date',            'Yes',      'YYYY-MM-DD or DD/MM/YYYY'],
    ['Currency',                 'Yes',      'INR or USD'],
    ['Partner',                  'No',       'Co-owner name if any'],
    ['Amount Notes',             'No',       'Notes on price calculation'],
    ['Details 1',                'No',       'e.g. Flat no / Block / Location'],
    ['Details 2',                'No',       'e.g. Area in sq.ft'],
    ['Details 3',                'No',       'e.g. Registry No'],
    ['Status',                   'No',       'active or sold (default: active)'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instrData);
  ws2['!cols'] = [22, 10, 36].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

  XLSX.writeFile(wb, 'real_estate_template.xlsx');
}

interface ParsedRow { raw: unknown[]; data: Partial<RealEstateProperty>; errors: string[]; index: number; }

interface Props {
  onImport: (properties: RealEstateProperty[]) => void;
  onClose: () => void;
}

export default function RealEstateImportModal({ onImport, onClose }: Props) {
  const [step, setStep]           = useState<'upload' | 'preview' | 'done'>('upload');
  const [dragging, setDragging]   = useState(false);
  const [fileName, setFileName]   = useState('');
  const [rows, setRows]           = useState<ParsedRow[]>([]);
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
      const colMap  = detectColumn(headers);

      const parsed: ParsedRow[] = (raw.slice(1) as unknown[][])
        .filter(r => r.some(c => c !== '' && c !== null && c !== undefined))
        .map((r, i) => {
          const { data, errors } = parseRow(r, colMap);
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
    e.target.value = '';
  };

  const validRows   = rows.filter(r => r.errors.length === 0);
  const invalidRows = rows.filter(r => r.errors.length > 0);

  const handleImport = () => {
    const properties: RealEstateProperty[] = validRows.map((r, i) => {
      const { id: _ignored, ...rest } = r.data as RealEstateProperty;
      return { id: (Date.now() + i).toString(), ...rest };
    });
    onImport(properties);
    setStep('done');
  };

  const fmt = (n: number, cur: Currency) =>
    (cur === 'INR' ? '₹' : '$') + n.toLocaleString(cur === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 0 });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-1.5 rounded-lg">
              <FileSpreadsheet className="text-orange-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Import Real Estate from Excel</h2>
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
                  dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                }`}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">Drop your Excel file here</p>
                <p className="text-sm text-gray-400 mt-1">or click to browse · .xlsx, .xls, .csv supported</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} className="hidden" />
              </div>

              {/* Template download */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">Download Template</p>
                  <p className="text-xs text-gray-500 mt-0.5">Sample data + Instructions sheet included.</p>
                </div>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
              </div>

              {/* Column reference */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expected Columns</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { col: 'Property Name',           req: true,  eg: 'Green Valley Flat 4B' },
                    { col: 'Property Price',           req: true,  eg: '5000000' },
                    { col: 'My Share %',               req: false, eg: '100 (default)' },
                    { col: 'Appreciation Per Year %',  req: false, eg: '8 (default 0)' },
                    { col: 'Purchase Date',            req: true,  eg: '2022-06-15 or 15/06/2022' },
                    { col: 'Currency',                 req: true,  eg: 'INR or USD' },
                    { col: 'Partner',                  req: false, eg: 'Rohini' },
                    { col: 'Amount Notes',             req: false, eg: 'Registry + stamp duty' },
                    { col: 'Details 1',                req: false, eg: 'Flat No, Block' },
                    { col: 'Details 2',                req: false, eg: '1200 sq.ft' },
                    { col: 'Details 3',                req: false, eg: 'Registry No' },
                    { col: 'Status',                   req: false, eg: 'active or sold (default: active)' },
                  ].map(f => (
                    <div key={f.col} className="flex items-start gap-1.5">
                      <span className={`mt-0.5 text-[10px] font-bold px-1 rounded shrink-0 ${f.req ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
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
                <div className="flex items-center gap-1.5 bg-orange-100 rounded-full px-3 py-1.5 text-xs font-semibold text-orange-700">
                  Active: {validRows.filter(r => r.data.status !== 'sold').length} · Sold: {validRows.filter(r => r.data.status === 'sold').length}
                </div>
              </div>

              {/* Preview table */}
              {validRows.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview — Valid Rows ({validRows.length})</p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-72">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {['Row', 'Property Name', 'Price', 'My Share', 'My Investment', 'Apprec.', 'Date', 'Currency', 'Partner', 'Status'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {validRows.map(r => {
                          const cur   = (r.data.currency ?? 'INR') as Currency;
                          const price = r.data.propertyPrice ?? 0;
                          const share = r.data.mySharePercent ?? 100;
                          const myInv = price * (share / 100);
                          return (
                            <tr key={r.index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-400">{r.index}</td>
                              <td className="px-3 py-2 font-semibold text-gray-800 max-w-[160px] truncate" title={r.data.propertyName}>{r.data.propertyName}</td>
                              <td className="px-3 py-2 text-gray-600">{fmt(price, cur)}</td>
                              <td className="px-3 py-2 text-gray-600">{share}%</td>
                              <td className="px-3 py-2 font-semibold text-orange-700">{fmt(myInv, cur)}</td>
                              <td className="px-3 py-2 text-gray-500">{r.data.appreciationPerYear ? `${r.data.appreciationPerYear}%` : '—'}</td>
                              <td className="px-3 py-2 text-gray-500">{r.data.purchaseDate}</td>
                              <td className="px-3 py-2">{cur}</td>
                              <td className="px-3 py-2 text-gray-400">{r.data.partner ?? '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.data.status === 'sold' ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>
                                  {r.data.status?.toUpperCase() ?? 'ACTIVE'}
                                </span>
                              </td>
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
              <p className="text-gray-500 mt-2">{validRows.length} properties imported successfully.</p>
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
              <button onClick={handleImport} disabled={validRows.length === 0}
                className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white rounded-lg font-medium text-sm transition-colors">
                Import {validRows.length} {validRows.length === 1 ? 'Property' : 'Properties'}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
