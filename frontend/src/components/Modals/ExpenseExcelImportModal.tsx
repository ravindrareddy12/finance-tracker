import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { MonthlyObligation, ObligationType, PaymentStatus } from '../../types';

const OBLIGATION_TYPES: ObligationType[] = [
  'Credit Card', 'Housing Loan', 'Personal Loan', 'Rent', 'Others',
];

// Flexible column aliases
const ALIASES: Record<string, string[]> = {
  type:     ['type', 'category', 'obligation_type', 'expense_type', 'kind'],
  note:     ['note', 'notes', 'description', 'details', 'name', 'remark', 'label'],
  amount:   ['amount', 'amt', 'value', 'total', 'cost', 'sum'],
  currency: ['currency', 'cur', 'ccy', 'currency_type'],
  status:   ['status', 'payment_status', 'paid_status', 'state'],
  dueDate:  ['due_date', 'duedate', 'due', 'payment_due', 'bill_date'],
  paidDate: ['paid_date', 'paiddate', 'paid_on', 'payment_date', 'cleared_date'],
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
  if (!val && val !== 0) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normalizeType(raw: string): ObligationType | null {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('credit'))  return 'Credit Card';
  if (lower.includes('housing') || lower.includes('home') || lower.includes('mortgage')) return 'Housing Loan';
  if (lower.includes('personal')) return 'Personal Loan';
  if (lower.includes('rent'))    return 'Rent';
  if (lower.includes('other'))   return 'Others';
  // Exact match fallback
  const match = OBLIGATION_TYPES.find(t => t.toLowerCase() === lower);
  return match ?? null;
}

function normalizeStatus(raw: string): PaymentStatus | null {
  const lower = raw.toLowerCase().trim();
  if (lower === 'paid' || lower === 'yes' || lower === 'done' || lower === 'cleared' || lower === 'p') return 'Paid';
  if (lower === 'unpaid' || lower === 'no' || lower === 'pending' || lower === 'due' || lower === 'u' || lower === '') return 'Unpaid';
  return null;
}

interface ParsedExpenseRow {
  index: number;
  errors: string[];
  type: ObligationType;
  note: string;
  amount: number;
  currency: 'INR' | 'USD';
  status: PaymentStatus;
  dueDate: string | null;
  paidDate: string | null;
  // Derived: which YYYY-MM bucket this goes into
  monthKey: string;
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseRow(
  row: unknown[],
  colMap: Record<string, number>,
  index: number,
  fallbackMonthKey: string,
): ParsedExpenseRow {
  const get = (field: string) => colMap[field] !== undefined ? row[colMap[field]] : undefined;
  const errors: string[] = [];

  // Type
  const rawType = String(get('type') ?? '').trim();
  const type = normalizeType(rawType);
  if (!type) errors.push(`Type must be one of: ${OBLIGATION_TYPES.join(', ')} (got "${rawType}")`);

  // Note
  const note = String(get('note') ?? '').trim();
  if (!note) errors.push('Note/description is required');

  // Amount
  const amount = parseFloat(String(get('amount') ?? ''));
  if (isNaN(amount) || amount < 0) errors.push('Amount must be a non-negative number');

  // Currency
  const rawCur = String(get('currency') ?? 'INR').trim().toUpperCase();
  const currency = (rawCur === 'INR' || rawCur === 'USD') ? rawCur as 'INR' | 'USD' : 'INR';
  if (rawCur && rawCur !== 'INR' && rawCur !== 'USD') {
    errors.push(`Currency must be INR or USD (got "${rawCur}"), defaulting to INR`);
  }

  // Status
  const rawStatus = String(get('status') ?? 'Unpaid').trim();
  const status = normalizeStatus(rawStatus) ?? 'Unpaid';

  // Dates
  const dueDate  = parseDate(get('dueDate'));
  const paidDate = parseDate(get('paidDate'));

  // Determine month bucket: due date takes priority, else fallback
  let monthKey = fallbackMonthKey;
  if (dueDate) {
    const d = new Date(dueDate);
    if (!isNaN(d.getTime())) monthKey = toMonthKey(d);
  }

  return {
    index, errors,
    type:     type ?? 'Others',
    note,
    amount:   isNaN(amount) ? 0 : amount,
    currency,
    status,
    dueDate:  dueDate ?? null,
    paidDate: paidDate ?? null,
    monthKey,
  };
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = ['Type', 'Note', 'Amount', 'Currency', 'Status', 'Due Date', 'Paid Date'];
  const sample: unknown[][] = [
    ['Credit Card',   'HDFC Millennia',         8500,  'INR', 'Paid',   '2024-01-10', '2024-01-09'],
    ['Housing Loan',  'SBI Home Loan EMI',       45000, 'INR', 'Paid',   '2024-01-05', '2024-01-05'],
    ['Personal Loan', 'Bajaj Finserv',           12000, 'INR', 'Unpaid', '2024-01-20', ''],
    ['Rent',          'Apartment Jan',           25000, 'INR', 'Paid',   '2024-01-01', '2024-01-01'],
    ['Others',        'Netflix subscription',      649, 'INR', 'Unpaid', '',           ''],
    ['Credit Card',   'Chase Sapphire',            250, 'USD', 'Unpaid', '2024-01-15', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws['!cols'] = [16, 24, 10, 10, 10, 12, 12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

  const instrData = [
    ['Field',     'Required', 'Notes'],
    ['Type',      'Yes',      'Credit Card, Housing Loan, Personal Loan, Rent, or Others (partial match allowed)'],
    ['Note',      'Yes',      'Description or name of the expense (e.g. HDFC Millennia, Apartment Rent)'],
    ['Amount',    'Yes',      'Numeric amount (e.g. 8500 or 250.50)'],
    ['Currency',  'No',       'INR or USD (default: INR)'],
    ['Status',    'No',       'Paid or Unpaid (default: Unpaid)'],
    ['Due Date',  'No',       'YYYY-MM-DD or DD/MM/YYYY — determines which month the entry goes into'],
    ['Paid Date', 'No',       'YYYY-MM-DD or DD/MM/YYYY — set when status is Paid'],
    [''],
    ['Routing:',  '', 'If Due Date is provided, the entry is stored in that month. Otherwise it goes into the selected import month.'],
    ['Multiple months:', '', 'You can mix entries from different months in one sheet — they will be routed automatically.'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instrData);
  ws2['!cols'] = [18, 10, 70].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

  XLSX.writeFile(wb, 'expenses_template.xlsx');
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

interface Props {
  allData: Record<string, MonthlyObligation[]>;
  defaultMonthKey: string;
  onImport: (updatedAllData: Record<string, MonthlyObligation[]>) => void;
  onClose: () => void;
}

export default function ExpenseExcelImportModal({ allData, defaultMonthKey, onImport, onClose }: Props) {
  const [step, setStep]             = useState<'upload' | 'preview' | 'done'>('upload');
  const [dragging, setDragging]     = useState(false);
  const [fileName, setFileName]     = useState('');
  const [rows, setRows]             = useState<ParsedExpenseRow[]>([]);
  const [importing, setImporting]   = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [monthSummary, setMonthSummary] = useState<Record<string, number>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [fallbackMonth, setFallbackMonth] = useState(defaultMonthKey);
  const fileRef = useRef<HTMLInputElement>(null);

  // Generate month options: ±24 months around today
  const monthOptions = (() => {
    const opts: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = -24; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = toMonthKey(d);
      opts.push({ key, label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }) });
    }
    return opts;
  })();

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

      const parsed: ParsedExpenseRow[] = (raw.slice(1) as unknown[][])
        .filter(r => r.some(c => c !== '' && c !== null && c !== undefined))
        .map((r, i) => parseRow(r, colMap, i + 2, fallbackMonth));

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
  }, [fallbackMonth]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const validRows   = rows.filter(r => r.errors.length === 0);
  const invalidRows = rows.filter(r => r.errors.length > 0);

  // Count how many valid rows go into each month
  const previewMonthBreakdown = validRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.monthKey] = (acc[r.monthKey] ?? 0) + 1;
    return acc;
  }, {});

  const handleImport = () => {
    setImporting(true);
    const next = { ...allData };
    validRows.forEach(row => {
      const ob: MonthlyObligation = {
        id:       crypto.randomUUID(),
        type:     row.type,
        note:     row.note,
        amount:   row.amount,
        currency: row.currency,
        status:   row.status,
        paidDate: row.paidDate,
        dueDate:  row.dueDate,
      };
      next[row.monthKey] = [...(next[row.monthKey] ?? []), ob];
    });
    onImport(next);
    setImportedCount(validRows.length);
    setMonthSummary(previewMonthBreakdown);
    setStep('done');
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-1.5 rounded-lg">
              <FileSpreadsheet className="text-blue-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Import Expenses from Excel</h2>
              {fileName && <p className="text-xs text-gray-400">{fileName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* STEP: Upload */}
          {step === 'upload' && (
            <>
              {/* Fallback month selector */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">Default Import Month</p>
                  <p className="text-xs text-gray-500 mt-0.5">Rows without a Due Date will be placed into this month.</p>
                </div>
                <select
                  value={fallbackMonth}
                  onChange={e => setFallbackMonth(e.target.value)}
                  className="text-sm border border-blue-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {monthOptions.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">Drop your Excel file here</p>
                <p className="text-sm text-gray-400 mt-1">or click to browse · .xlsx, .xls, .csv supported</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} className="hidden" />
              </div>

              {/* Template */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700">Need a template?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Download with sample data and column instructions.</p>
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
                    { col: 'Type',     req: true,  eg: 'Credit Card, Housing Loan, Personal Loan, Rent, Others' },
                    { col: 'Note',     req: true,  eg: 'HDFC Millennia, SBI EMI, Apartment rent…' },
                    { col: 'Amount',   req: true,  eg: '8500 or 250.50' },
                    { col: 'Currency', req: false, eg: 'INR or USD (default: INR)' },
                    { col: 'Status',   req: false, eg: 'Paid or Unpaid (default: Unpaid)' },
                    { col: 'Due Date', req: false, eg: '2024-01-10 or 10/01/2024 — routes to that month' },
                    { col: 'Paid Date',req: false, eg: '2024-01-09 or 09/01/2024' },
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
                  Paid: {validRows.filter(r => r.status === 'Paid').length} · Unpaid: {validRows.filter(r => r.status === 'Unpaid').length}
                </div>
              </div>

              {/* Month breakdown */}
              {Object.keys(previewMonthBreakdown).length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Entries will be routed to:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(previewMonthBreakdown).sort().map(([key, count]) => (
                      <span key={key} className="text-xs bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                        {monthLabel(key)} — {count} item{count !== 1 ? 's' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
                          {['Row', 'Type', 'Note', 'Amount', 'Cur', 'Status', 'Due Date', 'Paid Date', 'Month'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {validRows.map(r => (
                          <tr key={r.index} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-gray-400">{r.index}</td>
                            <td className="px-3 py-1.5">
                              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{r.type}</span>
                            </td>
                            <td className="px-3 py-1.5 text-gray-700 max-w-[140px] truncate" title={r.note}>{r.note}</td>
                            <td className="px-3 py-1.5 font-semibold text-gray-800 whitespace-nowrap">
                              {r.currency === 'INR' ? '₹' : '$'}{r.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-1.5 text-gray-500">{r.currency}</td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{r.dueDate ?? '—'}</td>
                            <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{r.paidDate ?? '—'}</td>
                            <td className="px-3 py-1.5 text-indigo-600 text-[10px] font-medium whitespace-nowrap">{monthLabel(r.monthKey)}</td>
                          </tr>
                        ))}
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
              <p className="text-gray-500 mt-2">{importedCount} expense{importedCount !== 1 ? 's' : ''} imported successfully.</p>
              {Object.keys(monthSummary).length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {Object.entries(monthSummary).sort().map(([key, count]) => (
                    <span key={key} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full font-medium">
                      {monthLabel(key)}: {count}
                    </span>
                  ))}
                </div>
              )}
              {invalidRows.length > 0 && (
                <p className="text-xs text-amber-600 mt-3">{invalidRows.length} rows had errors and were skipped.</p>
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
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-medium text-sm transition-colors">
                {importing ? 'Importing…' : `Import ${validRows.length} Expense${validRows.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
