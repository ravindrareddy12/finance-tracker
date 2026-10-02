import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet, Trash2 } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { Currency, DematAccount } from '../../types';

const VALID_CURRENCIES: Currency[] = ['INR', 'USD'];

interface RowData {
  symbol: string;
  quantity: number;
  buyPrice: number;
  currency: Currency;
  dematAccount: DematAccount;
  date: string;
}

interface ParsedRow {
  row: number;
  data: Partial<RowData>;
  errors: string[];
  valid: boolean;
}

function parseRow(raw: Record<string, unknown>, idx: number, validAccounts: string[]): ParsedRow {
  const errors: string[] = [];

  // Normalise keys to lowercase-no-space
  const norm: Record<string, string> = {};
  Object.keys(raw).forEach(k => { norm[k.toLowerCase().replace(/\s+/g, '')] = String(raw[k] ?? '').trim(); });

  const symbol = (norm['symbol'] ?? '').toUpperCase();
  if (!symbol) errors.push('Symbol is required');

  const qty = parseFloat(norm['quantity'] ?? norm['qty'] ?? '');
  if (isNaN(qty) || qty <= 0) errors.push('Quantity must be > 0');

  const price = parseFloat(norm['buyprice'] ?? norm['price'] ?? norm['avgbuyprice'] ?? '');
  if (isNaN(price) || price <= 0) errors.push('Buy Price must be > 0');

  const rawCcy = (norm['currency'] ?? 'INR').toUpperCase() as Currency;
  const currency: Currency = VALID_CURRENCIES.includes(rawCcy) ? rawCcy : 'INR';
  if (!VALID_CURRENCIES.includes(rawCcy)) errors.push(`Currency must be INR or USD (got "${rawCcy}")`);

  const rawAcct = norm['demataccount'] ?? norm['demataccountname'] ?? norm['account'] ?? '';
  const dematAccount = validAccounts.find(a => a.toLowerCase() === rawAcct.toLowerCase()) as DematAccount | undefined;
  if (!dematAccount) errors.push(`Demat Account must be one of: ${validAccounts.join(', ')} (got "${rawAcct}")`);

  // Date: Excel serial number or string
  let dateStr = new Date().toISOString();
  const rawDate = norm['date'] ?? norm['buydate'] ?? '';
  if (rawDate) {
    // Excel may give a serial number
    const serial = parseFloat(rawDate);
    if (!isNaN(serial) && serial > 1000) {
      const parsed = XLSX.SSF.parse_date_code(serial);
      if (parsed) dateStr = new Date(parsed.y, parsed.m - 1, parsed.d).toISOString();
    } else {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) dateStr = d.toISOString();
    }
  }

  return {
    row: idx + 2,
    data: {
      symbol: symbol || undefined,
      quantity: isNaN(qty) ? undefined : qty,
      buyPrice: isNaN(price) ? undefined : price,
      currency: dematAccount ? currency : undefined,
      dematAccount: dematAccount,
      date: dateStr,
    },
    errors,
    valid: errors.length === 0,
  };
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Symbol', 'Quantity', 'Buy Price', 'Currency', 'Demat Account', 'Date'],
    ['RELIANCE.NS', 10, 2850, 'INR', 'Narendra', '2024-01-15'],
    ['TCS.NS', 5, 3500, 'INR', 'Rohini', '2024-02-20'],
    ['AAPL', 3, 175, 'USD', 'Dad', '2024-03-10'],
  ]);
  ws['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stocks');
  XLSX.writeFile(wb, 'finance_tracker_template.xlsx');
}

interface Props { onClose: () => void; }

export default function UploadModal({ onClose }: Props) {
  const { bulkAddBuy } = usePortfolio();
  const { config } = useAppConfig();
  const dematAccounts = config.dematAccounts;
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]         = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [imported, setImported]   = useState(false);
  const [dragOver, setDragOver]   = useState(false);

  const processFile = (file: File) => {
    setFileName(file.name);
    setRows([]);
    setImported(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: 'array', cellDates: false });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      setRows(json.map((r, i) => parseRow(r, i, dematAccounts)));
    };
    reader.readAsArrayBuffer(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const validRows   = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);

  const handleImport = () => {
    setImporting(true);
    bulkAddBuy(
      validRows.map(r => {
        const d = r.data as RowData;
        return {
          symbol:       d.symbol,
          quantity:     d.quantity,
          price:        d.buyPrice,
          currency:     d.currency,
          dematAccount: d.dematAccount,
          date:         d.date,
        };
      })
    );
    setImporting(false);
    setImported(true);
    setTimeout(onClose, 1500);
  };

  const removeRow = (rowNum: number) => setRows(prev => prev.filter(r => r.row !== rowNum));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-1.5 rounded-lg">
              <FileSpreadsheet className="text-blue-600 w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Upload Excel / CSV</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* Template download */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-blue-800">Need a template?</p>
              <p className="text-xs text-blue-600 mt-0.5">Columns: Symbol, Quantity, Buy Price, Currency, Demat Account, Date</p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
              <Download className="w-3.5 h-3.5" /> Download Template
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="text-sm font-medium text-gray-700">
              {fileName ? fileName : 'Drop your Excel file here or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv accepted</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
          </div>

          {/* Summary bar */}
          {rows.length > 0 && (
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-gray-500">{rows.length} rows found</span>
              <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                <CheckCircle className="w-4 h-4" /> {validRows.length} valid
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1 text-sm text-red-500 font-medium">
                  <AlertCircle className="w-4 h-4" /> {invalidRows.length} with errors
                </span>
              )}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">#</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">Symbol</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">Qty</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">Buy Price</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">Currency</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">Demat Account</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(r => (
                    <tr key={r.row} className={r.valid ? 'hover:bg-gray-50' : 'bg-red-50'}>
                      <td className="px-3 py-2 text-gray-400">{r.row}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-blue-700">{r.data.symbol ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{r.data.quantity ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{r.data.buyPrice ?? '—'}</td>
                      <td className="px-3 py-2">
                        {r.data.currency && (
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${r.data.currency === 'INR' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {r.data.currency}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r.data.dematAccount ?? <span className="text-red-500">—</span>}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {r.data.date ? new Date(r.data.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {r.valid
                          ? <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3.5 h-3.5" /> OK</span>
                          : (
                            <div className="space-y-0.5">
                              {r.errors.map((err, i) => (
                                <span key={i} className="flex items-start gap-1 text-red-500">
                                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span>{err}</span>
                                </span>
                              ))}
                            </div>
                          )}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeRow(r.row)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {imported && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {validRows.length} transaction{validRows.length !== 1 ? 's' : ''} imported successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            {invalidRows.length > 0
              ? `${invalidRows.length} row(s) with errors will be skipped.`
              : rows.length > 0 ? 'All rows are valid and ready to import.' : 'Upload a file to preview rows.'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validRows.length === 0 || importing || imported}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importing…' : `Import ${validRows.length} Row${validRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
