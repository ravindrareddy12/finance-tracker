import React, { useState, useMemo } from 'react';
import {
  Edit2, Trash2, ArrowUpRight, ArrowDownRight,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, X, Check, AlertTriangle, FileSpreadsheet, Download,
} from 'lucide-react';
import { downloadExcel } from '../../utils/exportExcel';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { getAccountColors } from '../../utils/accountColors';
import { Transaction, DematAccount, Currency } from '../../types';
import ExcelImportModal from '../Modals/ExcelImportModal';

const CURRENCIES: Currency[] = ['INR', 'USD'];

type SortKey = keyof Transaction | 'total';
type SortDir = 'asc' | 'desc';

interface EditState {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: string;
  price: string;
  currency: Currency;
  dematAccount: DematAccount;
  date: string;
}

function toEditState(t: Transaction): EditState {
  return {
    symbol: t.symbol,
    type: t.type,
    quantity: String(t.quantity),
    price: String(t.price),
    currency: t.currency,
    dematAccount: t.dematAccount,
    date: t.date.slice(0, 10),
  };
}

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string | null; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 opacity-30 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 inline text-blue-600" />
    : <ChevronDown className="w-3 h-3 ml-1 inline text-blue-600" />;
}

interface TransactionsListProps { currencyFilter?: 'INR' | 'USD'; }

export default function TransactionsList({ currencyFilter }: TransactionsListProps = {}) {
  const { transactions: allTransactions, updateTransaction, deleteTransaction } = usePortfolio();
  const { config } = useAppConfig();
  const dematAccounts = config.dematAccounts;
  const transactions = currencyFilter
    ? allTransactions.filter(t => t.currency === currencyFilter)
    : allTransactions;

  const [editId, setEditId]       = useState<string | null>(null);
  const [editData, setEditData]   = useState<EditState | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [filter, setFilter]       = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [sortKey, setSortKey]     = useState<string>('date');
  const [sortDir, setSortDir]     = useState<SortDir>('desc');
  const [showImport, setShowImport] = useState(false);

  const handleEdit = (t: Transaction) => { setEditId(t.id); setEditData(toEditState(t)); };
  const handleCancelEdit = () => { setEditId(null); setEditData(null); };

  const handleSave = (id: string) => {
    if (!editData) return;
    const qty = parseFloat(editData.quantity);
    const price = parseFloat(editData.price);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) return;
    updateTransaction(id, {
      symbol: editData.symbol.toUpperCase(),
      type: editData.type,
      quantity: qty,
      price,
      currency: editData.currency,
      dematAccount: editData.dematAccount,
      date: new Date(editData.date).toISOString(),
    });
    setEditId(null);
    setEditData(null);
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    setDeleteId(null);
  };

  const handleExport = () => {
    const rows = sorted.map(t => ({
      Date: new Date(t.date).toLocaleDateString('en-IN'),
      Symbol: t.symbol,
      Type: t.type,
      Quantity: t.quantity,
      Price: t.price,
      Total: +(t.quantity * t.price).toFixed(2),
      Currency: t.currency,
      'Demat Account': t.dematAccount,
    }));
    downloadExcel(rows, `equity-transactions-${currencyFilter ?? 'all'}`, 'Transactions');
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (!q) return true;
      return (
        t.symbol.toLowerCase().includes(q) ||
        t.dematAccount.toLowerCase().includes(q) ||
        t.currency.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
      );
    });
  }, [transactions, filter, typeFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === 'total') { av = a.quantity * a.price; bv = b.quantity * b.price; }
      else { av = (a as any)[sortKey] ?? ''; bv = (b as any)[sortKey] ?? ''; }
      let cmp = 0;
      if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv);
      else cmp = (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalBuys  = transactions.filter(t => t.type === 'buy').length;
  const totalSells = transactions.filter(t => t.type === 'sell').length;

  const ColHeader = ({ col, label, align = 'left' }: { col: string; label: string; align?: 'left' | 'right' }) => (
    <th
      onClick={() => handleSort(col)}
      className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors ${align === 'right' ? 'text-right' : 'text-left'} ${sortKey === col ? 'text-blue-600 bg-blue-50' : ''}`}
    >
      {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
          <span className="text-gray-400">Total</span>
          <span className="font-bold text-gray-800 ml-2">{transactions.length} transactions</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm flex items-center gap-1.5">
          <ArrowUpRight className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-green-700">{totalBuys} Buys</span>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm flex items-center gap-1.5">
          <ArrowDownRight className="w-4 h-4 text-red-500" />
          <span className="font-semibold text-red-600">{totalSells} Sells</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleExport} disabled={sorted.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-40">
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Import Excel
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          {/* Type filter buttons */}
          {(['all', 'buy', 'sell'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors capitalize ${
                typeFilter === t
                  ? t === 'buy'  ? 'bg-green-600 border-green-600 text-white'
                    : t === 'sell' ? 'bg-red-500 border-red-500 text-white'
                    : 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {t === 'all' ? 'All' : t === 'buy' ? 'Buys Only' : 'Sells Only'}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Search symbol, account…"
            className="pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-56"
          />
          {filter && (
            <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No transactions found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <ColHeader col="date"         label="Date" />
                <ColHeader col="symbol"       label="Symbol" />
                <ColHeader col="type"         label="Type" />
                <ColHeader col="quantity"     label="Qty"        align="right" />
                <ColHeader col="price"        label="Price"      align="right" />
                <ColHeader col="total"        label="Total"      align="right" />
                <ColHeader col="currency"     label="Currency" />
                <ColHeader col="dematAccount" label="Demat Acc" />
                <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(t => (
                editId === t.id && editData ? (
                  <EditRow key={t.id} t={t} data={editData} onChange={setEditData}
                    onSave={() => handleSave(t.id)} onCancel={handleCancelEdit} dematAccounts={dematAccounts} />
                ) : (
                  <ReadRow key={t.id} t={t}
                    onEdit={() => handleEdit(t)}
                    onDelete={() => setDeleteId(t.id)} dematAccounts={dematAccounts} />
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="text-red-600 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Delete Transaction?</h3>
                <p className="text-sm text-gray-500 mt-0.5">This will recalculate your holdings and P&L.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && <ExcelImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}

function ReadRow({ t, onEdit, onDelete, dematAccounts }: { t: Transaction; onEdit: () => void; onDelete: () => void; dematAccounts: string[] }) {
  const sym = t.currency === 'INR' ? '₹' : '$';
  const total = t.quantity * t.price;
  const isBuy = t.type === 'buy';
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
        {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-3 py-3 font-mono font-semibold text-blue-700">{t.symbol}</td>
      <td className="px-3 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isBuy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {isBuy ? 'Buy' : 'Sell'}
        </span>
      </td>
      <td className="px-3 py-3 text-gray-800 font-medium text-right">{t.quantity.toLocaleString()}</td>
      <td className="px-3 py-3 text-gray-700 text-right">{sym}{t.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
      <td className="px-3 py-3 text-gray-800 font-semibold text-right">{sym}{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
      <td className="px-3 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.currency === 'INR' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
          {t.currency}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAccountColors(t.dematAccount, dematAccounts).badge}`}>
          {t.dematAccount}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EditRow({ t, data, onChange, onSave, onCancel, dematAccounts }: {
  t: Transaction;
  data: EditState;
  onChange: (d: EditState) => void;
  onSave: () => void;
  onCancel: () => void;
  dematAccounts: string[];
}) {
  const set = (field: keyof EditState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...data, [field]: e.target.value });

  const inputCls = 'w-full px-2 py-1 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white';

  return (
    <tr className="bg-blue-50/60 border-y-2 border-blue-200">
      <td className="px-2 py-2">
        <input type="date" value={data.date} onChange={set('date')} className={inputCls} />
      </td>
      <td className="px-2 py-2">
        <input type="text" value={data.symbol} onChange={set('symbol')}
          className={`${inputCls} font-mono uppercase`} style={{ width: 80 }} />
      </td>
      <td className="px-2 py-2">
        <select value={data.type} onChange={set('type')} className={inputCls} style={{ width: 70 }}>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </td>
      <td className="px-2 py-2">
        <input type="number" value={data.quantity} onChange={set('quantity')}
          min="0" step="any" className={`${inputCls} text-right`} style={{ width: 70 }} />
      </td>
      <td className="px-2 py-2">
        <input type="number" value={data.price} onChange={set('price')}
          min="0" step="any" className={`${inputCls} text-right`} style={{ width: 80 }} />
      </td>
      <td className="px-2 py-2 text-xs text-gray-400 text-right">
        {(() => {
          const qty = parseFloat(data.quantity);
          const price = parseFloat(data.price);
          const sym = data.currency === 'INR' ? '₹' : '$';
          return (!isNaN(qty) && !isNaN(price)) ? `${sym}${(qty * price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';
        })()}
      </td>
      <td className="px-2 py-2">
        <select value={data.currency} onChange={set('currency')} className={inputCls} style={{ width: 65 }}>
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-2 py-2">
        <select value={data.dematAccount} onChange={set('dematAccount')} className={inputCls} style={{ width: 90 }}>
          {dematAccounts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onSave}
            className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors" title="Save">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onCancel}
            className="p-1.5 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="Cancel">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
