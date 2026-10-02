import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Landmark, Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { downloadExcel } from '../../utils/exportExcel';
import { AdditionalInvestment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import AddInvestmentModal from '../Modals/AddInvestmentModal';

function storageKey(user: string) { return `ft_investments_${user}`; }

function loadData(user: string): AdditionalInvestment[] {
  try { return JSON.parse(localStorage.getItem(storageKey(user)) || '[]'); }
  catch { return []; }
}

function saveData(user: string, data: AdditionalInvestment[]) {
  localStorage.setItem(storageKey(user), JSON.stringify(data));
}

function currentValue(inv: AdditionalInvestment): number {
  const years = Math.max(0, (Date.now() - new Date(inv.dateOfInvestment).getTime()) / (365.25 * 86400000));
  return inv.amountInvested * Math.pow(1 + inv.interestPercent / 100, years);
}

function fmt(n: number, currency: 'INR' | 'USD') {
  return n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 2 });
}
const sym = (c: 'INR' | 'USD') => c === 'INR' ? '₹' : '$';

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

type SortField = 'name' | 'dateOfInvestment' | 'amountInvested' | 'currentValue' | 'gain' | 'interestPercent';
type SortDir   = 'asc' | 'desc';

interface MetricCardProps { label: string; value: string; sub?: string; color?: string; }
function MetricCard({ label, value, sub, color = 'text-gray-800' }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return dir === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />;
}

export default function AdditionalInvestments() {
  const { currentUser } = useAuth();
  const user = currentUser ?? 'default';

  const [investments, setInvestments] = useState<AdditionalInvestment[]>(() => loadData(user));
  const [showAdd,        setShowAdd]        = useState(false);
  const [editItem,       setEditItem]       = useState<AdditionalInvestment | null>(null);
  const [deleteConfirm,  setDeleteConfirm]  = useState<string | null>(null);

  // Filters
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'INR' | 'USD'>('ALL');
  const [search,         setSearch]         = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('dateOfInvestment');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  const persist = (data: AdditionalInvestment[]) => { setInvestments(data); saveData(user, data); };

  const handleAdd    = (inv: AdditionalInvestment) => { persist([...investments, inv]); setShowAdd(false); };
  const handleEdit   = (inv: AdditionalInvestment) => { persist(investments.map(x => x.id === inv.id ? inv : x)); setEditItem(null); };
  const handleDelete = (id: string) => { persist(investments.filter(x => x.id !== id)); setDeleteConfirm(null); };

  const handleSortClick = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = investments;
    if (currencyFilter !== 'ALL') list = list.filter(i => i.currency === currencyFilter);
    if (search.trim())            list = list.filter(i =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.notes ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return [...list].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (sortField) {
        case 'name':             aVal = a.name;                                             bVal = b.name;                                             break;
        case 'dateOfInvestment': aVal = new Date(a.dateOfInvestment).getTime();             bVal = new Date(b.dateOfInvestment).getTime();             break;
        case 'amountInvested':   aVal = a.amountInvested;                                   bVal = b.amountInvested;                                   break;
        case 'currentValue':     aVal = currentValue(a);                                    bVal = currentValue(b);                                    break;
        case 'gain':             aVal = currentValue(a) - a.amountInvested;                 bVal = currentValue(b) - b.amountInvested;                 break;
        case 'interestPercent':  aVal = a.interestPercent;                                  bVal = b.interestPercent;                                  break;
      }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [investments, currencyFilter, search, sortField, sortDir]);

  const inrList = investments.filter(i => i.currency === 'INR');
  const usdList = investments.filter(i => i.currency === 'USD');

  const totalInvestedINR = inrList.reduce((s, i) => s + i.amountInvested, 0);
  const totalCurrentINR  = inrList.reduce((s, i) => s + currentValue(i), 0);
  const totalInvestedUSD = usdList.reduce((s, i) => s + i.amountInvested, 0);
  const totalCurrentUSD  = usdList.reduce((s, i) => s + currentValue(i), 0);

  const thCls = 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-teal-600 transition-colors';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Additional Investments</h2>
          <p className="text-sm text-gray-400 mt-0.5">FDs, PPF, bonds, savings schemes and more</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const rows = filtered.map((inv, idx) => {
                const curVal = currentValue(inv);
                const gain = curVal - inv.amountInvested;
                return {
                  '#': idx + 1,
                  Name: inv.name,
                  Currency: inv.currency,
                  'Date of Investment': new Date(inv.dateOfInvestment).toLocaleDateString('en-IN'),
                  'Amount Invested': inv.amountInvested,
                  'Interest % p.a.': inv.interestPercent,
                  'Current Value': +curVal.toFixed(2),
                  'Gain': +gain.toFixed(2),
                  'Gain %': inv.amountInvested > 0 ? +((gain / inv.amountInvested) * 100).toFixed(2) : 0,
                  Notes: inv.notes ?? '',
                };
              });
              downloadExcel(rows, 'additional-investments', 'Investments');
            }}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Investment
          </button>
        </div>
      </div>

      {/* Filter / Sort bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search investment / notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 w-52"
          />
        </div>

        {/* Currency filter */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
          {(['ALL', 'INR', 'USD'] as const).map(c => (
            <button key={c} onClick={() => setCurrencyFilter(c)}
              className={`px-3 py-1.5 transition-colors ${currencyFilter === c ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={sortField}
            onChange={e => { setSortField(e.target.value as SortField); setSortDir('asc'); }}
            className="text-xs border-none outline-none bg-transparent text-gray-600 cursor-pointer"
          >
            <option value="dateOfInvestment">Date</option>
            <option value="name">Name</option>
            <option value="amountInvested">Amount Invested</option>
            <option value="currentValue">Current Value</option>
            <option value="gain">Gain</option>
            <option value="interestPercent">Interest %</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="ml-1 text-teal-600 hover:text-teal-800">
            {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {filtered.length < investments.length && (
          <span className="text-xs text-gray-400">{filtered.length} of {investments.length} shown</span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {inrList.length > 0 && (
          <>
            <MetricCard label="INR Total Invested" value={`₹${fmt(totalInvestedINR, 'INR')}`} sub={`${inrList.length} investment${inrList.length !== 1 ? 's' : ''}`} />
            <MetricCard label="INR Current Value"  value={`₹${fmt(totalCurrentINR, 'INR')}`}  color="text-teal-600" sub={`+₹${fmt(totalCurrentINR - totalInvestedINR, 'INR')} gain`} />
          </>
        )}
        {usdList.length > 0 && (
          <>
            <MetricCard label="USD Total Invested" value={`$${fmt(totalInvestedUSD, 'USD')}`} sub={`${usdList.length} investment${usdList.length !== 1 ? 's' : ''}`} />
            <MetricCard label="USD Current Value"  value={`$${fmt(totalCurrentUSD, 'USD')}`}  color="text-teal-600" sub={`+$${fmt(totalCurrentUSD - totalInvestedUSD, 'USD')} gain`} />
          </>
        )}
        {investments.length === 0 && (
          <MetricCard label="Total Investments" value="0" sub="Add your first investment" />
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-20 text-center text-gray-400">
          <Landmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{investments.length === 0 ? 'No investments yet' : 'No results match filters'}</p>
          <p className="text-sm mt-1">{investments.length === 0 ? 'Click "Add Investment" to get started' : 'Clear filters to see all investments'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                  <th className={`${thCls} text-left`} onClick={() => handleSortClick('name')}>
                    <div className="flex items-center gap-1">Investment <SortIcon active={sortField === 'name'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-left`} onClick={() => handleSortClick('dateOfInvestment')}>
                    <div className="flex items-center gap-1">Date <SortIcon active={sortField === 'dateOfInvestment'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('amountInvested')}>
                    <div className="flex items-center justify-end gap-1">Amount Invested <SortIcon active={sortField === 'amountInvested'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-center`} onClick={() => handleSortClick('interestPercent')}>
                    <div className="flex items-center justify-center gap-1">Interest % <SortIcon active={sortField === 'interestPercent'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('currentValue')}>
                    <div className="flex items-center justify-end gap-1">Current Value <SortIcon active={sortField === 'currentValue'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('gain')}>
                    <div className="flex items-center justify-end gap-1">Gain <SortIcon active={sortField === 'gain'} dir={sortDir} /></div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((inv, idx) => {
                  const curVal  = currentValue(inv);
                  const gain    = curVal - inv.amountInvested;
                  const gainPct = inv.amountInvested > 0 ? (gain / inv.amountInvested) * 100 : 0;
                  const s       = sym(inv.currency);

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{inv.name}</p>
                        {inv.notes && <p className="text-xs text-gray-400 truncate max-w-[200px]">{inv.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <p>{new Date(inv.dateOfInvestment).toLocaleDateString('en-IN')}</p>
                        <p className="text-gray-400">{daysSince(inv.dateOfInvestment)}d ago</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {s}{fmt(inv.amountInvested, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700">
                          {inv.interestPercent}% p.a.
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-teal-600">
                        {s}{fmt(curVal, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-semibold text-sm ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gain >= 0 ? '+' : ''}{s}{fmt(Math.abs(gain), inv.currency)}
                          </span>
                          <span className={`text-xs ${gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {gain >= 0 ? '+' : ''}{gainPct.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditItem(inv)} title="Edit"
                            className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {deleteConfirm === inv.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(inv.id)}
                                className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg font-medium hover:bg-red-700">Yes</button>
                              <button onClick={() => setDeleteConfirm(null)}
                                className="text-xs border border-gray-200 px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-50">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(inv.id)} title="Delete"
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filtered.length > 1 && (() => {
                const inrF   = filtered.filter(i => i.currency === 'INR');
                const usdF   = filtered.filter(i => i.currency === 'USD');
                const inrInv = inrF.reduce((s, i) => s + i.amountInvested, 0);
                const inrCur = inrF.reduce((s, i) => s + currentValue(i), 0);
                const usdInv = usdF.reduce((s, i) => s + i.amountInvested, 0);
                const usdCur = usdF.reduce((s, i) => s + currentValue(i), 0);
                return (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200 text-sm font-semibold">
                    {inrF.length > 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-gray-600">INR Total</td>
                        <td className="px-4 py-3 text-right text-gray-800">₹{fmt(inrInv, 'INR')}</td>
                        <td />
                        <td className="px-4 py-3 text-right text-teal-600">₹{fmt(inrCur, 'INR')}</td>
                        <td className="px-4 py-3 text-right text-green-600">+₹{fmt(inrCur - inrInv, 'INR')}</td>
                        <td />
                      </tr>
                    )}
                    {usdF.length > 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-gray-600">USD Total</td>
                        <td className="px-4 py-3 text-right text-gray-800">${fmt(usdInv, 'USD')}</td>
                        <td />
                        <td className="px-4 py-3 text-right text-teal-600">${fmt(usdCur, 'USD')}</td>
                        <td className="px-4 py-3 text-right text-green-600">+${fmt(usdCur - usdInv, 'USD')}</td>
                        <td />
                      </tr>
                    )}
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      )}

      {showAdd  && <AddInvestmentModal onSave={handleAdd}  onClose={() => setShowAdd(false)} />}
      {editItem && <AddInvestmentModal initial={editItem} onSave={handleEdit} onClose={() => setEditItem(null)} />}
    </div>
  );
}
