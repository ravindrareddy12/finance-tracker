import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowDownCircle, HandCoins, Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { downloadExcel } from '../../utils/exportExcel';
import { LoanInvestment, LoanReturn } from '../../types';
import { useAuth } from '../../context/AuthContext';
import AddLoanModal from '../Modals/AddLoanModal';
import AddReturnModal from '../Modals/AddReturnModal';

function storageKey(user: string) { return `ft_loans_${user}`; }

function loadInvestments(user: string): LoanInvestment[] {
  try { return JSON.parse(localStorage.getItem(storageKey(user)) || '[]'); }
  catch { return []; }
}

function saveInvestments(user: string, data: LoanInvestment[]) {
  localStorage.setItem(storageKey(user), JSON.stringify(data));
}

function fmt(n: number, currency: 'INR' | 'USD') {
  return n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 2 });
}
function sym(currency: 'INR' | 'USD') { return currency === 'INR' ? '₹' : '$'; }

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getOutstanding(inv: LoanInvestment): number {
  const returned = inv.returns.reduce((s, r) => s + r.amount, 0);
  return Math.max(0, inv.principal - returned);
}

type LoanStatus = 'Active' | 'Partial' | 'Fully Returned';
function statusInfo(investment: LoanInvestment): { label: LoanStatus; cls: string } {
  const outstanding = getOutstanding(investment);
  const returned    = investment.returns.reduce((s, r) => s + r.amount, 0);
  if (outstanding <= 0) return { label: 'Fully Returned', cls: 'bg-green-100 text-green-700' };
  if (returned > 0)     return { label: 'Partial',        cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Active', cls: 'bg-blue-100 text-blue-700' };
}

type SortField = 'customerName' | 'dateGiven' | 'principal' | 'outstanding' | 'interestRate';
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

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return dir === 'asc' ? <ArrowUp className="w-3 h-3 text-violet-600" /> : <ArrowDown className="w-3 h-3 text-violet-600" />;
}

export default function LoanTracker() {
  const { currentUser } = useAuth();
  const user = currentUser ?? 'default';

  const [investments, setInvestments] = useState<LoanInvestment[]>(() => loadInvestments(user));
  const [showAddLoan, setShowAddLoan]   = useState(false);
  const [returnFor, setReturnFor]       = useState<LoanInvestment | null>(null);
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filters
  const [currencyFilter, setCurrencyFilter]   = useState<'ALL' | 'INR' | 'USD'>('ALL');
  const [statusFilter,   setStatusFilter]     = useState<'ALL' | LoanStatus>('ALL');
  const [search,         setSearch]           = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('dateGiven');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  const save = (data: LoanInvestment[]) => { setInvestments(data); saveInvestments(user, data); };

  const handleAddInvestment = (inv: LoanInvestment) => { save([...investments, inv]); setShowAddLoan(false); };
  const handleAddReturn = (ret: LoanReturn) => {
    if (!returnFor) return;
    save(investments.map(inv => inv.id === returnFor.id ? { ...inv, returns: [...inv.returns, ret] } : inv));
    setReturnFor(null);
  };
  const handleDelete = (id: string) => { save(investments.filter(inv => inv.id !== id)); setDeleteConfirm(null); };

  const handleSortClick = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = investments;
    if (currencyFilter !== 'ALL') list = list.filter(i => i.currency === currencyFilter);
    if (statusFilter   !== 'ALL') list = list.filter(i => statusInfo(i).label === statusFilter);
    if (search.trim())            list = list.filter(i => i.customerName.toLowerCase().includes(search.toLowerCase()));

    return [...list].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (sortField) {
        case 'customerName':  aVal = a.customerName;          bVal = b.customerName;          break;
        case 'dateGiven':     aVal = new Date(a.dateGiven).getTime(); bVal = new Date(b.dateGiven).getTime(); break;
        case 'principal':     aVal = a.principal;             bVal = b.principal;             break;
        case 'outstanding':   aVal = getOutstanding(a);       bVal = getOutstanding(b);       break;
        case 'interestRate':  aVal = a.interestRate ?? -1;    bVal = b.interestRate ?? -1;    break;
      }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [investments, currencyFilter, statusFilter, search, sortField, sortDir]);

  const inrInvs = filtered.filter(i => i.currency === 'INR');
  const usdInvs = filtered.filter(i => i.currency === 'USD');

  const sumPrincipal = (list: LoanInvestment[]) => list.reduce((s, i) => s + i.principal, 0);
  const sumReturned  = (list: LoanInvestment[]) => list.reduce((s, i) => s + i.returns.reduce((x, r) => x + r.amount, 0), 0);

  const inrPrincipal = sumPrincipal(inrInvs), inrReturned = sumReturned(inrInvs);
  const usdPrincipal = sumPrincipal(usdInvs), usdReturned = sumReturned(usdInvs);
  const activeCount  = filtered.filter(i => getOutstanding(i) > 0).length;

  const thCls = 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-violet-600 transition-colors';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Interest Investments</h2>
          <p className="text-sm text-gray-400 mt-0.5">Track money lent out and repayments received</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const rows = filtered.map(inv => {
                const totalReturned = inv.returns.reduce((s, r) => s + r.amount, 0);
                return {
                  Customer: inv.customerName,
                  Currency: inv.currency,
                  'Date Given': new Date(inv.dateGiven).toLocaleDateString('en-IN'),
                  Principal: inv.principal,
                  'Total Returned': +totalReturned.toFixed(2),
                  Outstanding: +Math.max(0, inv.principal - totalReturned).toFixed(2),
                  'Interest Rate %': inv.interestRate ?? '',
                  Status: statusInfo(inv).label,
                  Notes: inv.notes ?? '',
                };
              });
              downloadExcel(rows, 'interest-investments', 'Investments');
            }}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowAddLoan(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
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
            placeholder="Search customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 w-44"
          />
        </div>

        {/* Currency filter */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
          {(['ALL', 'INR', 'USD'] as const).map(c => (
            <button key={c} onClick={() => setCurrencyFilter(c)}
              className={`px-3 py-1.5 transition-colors ${currencyFilter === c ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
          {(['ALL', 'Active', 'Partial', 'Fully Returned'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 transition-colors ${statusFilter === s ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {s}
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
            <option value="dateGiven">Date Given</option>
            <option value="customerName">Customer Name</option>
            <option value="principal">Principal</option>
            <option value="outstanding">Outstanding</option>
            <option value="interestRate">Interest Rate</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="ml-1 text-violet-600 hover:text-violet-800">
            {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {filtered.length < investments.length && (
          <span className="text-xs text-gray-400">{filtered.length} of {investments.length} shown</span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {inrInvs.length > 0 && (
          <>
            <MetricCard label="INR Invested"    value={`₹${fmt(inrPrincipal, 'INR')}`} sub={`${inrInvs.length} customer${inrInvs.length !== 1 ? 's' : ''}`} />
            <MetricCard label="INR Returned"    value={`₹${fmt(inrReturned, 'INR')}`}  color="text-emerald-600" />
            <MetricCard label="INR Outstanding" value={`₹${fmt(Math.max(0, inrPrincipal - inrReturned), 'INR')}`} color="text-red-600" />
          </>
        )}
        {usdInvs.length > 0 && (
          <>
            <MetricCard label="USD Invested"    value={`$${fmt(usdPrincipal, 'USD')}`} sub={`${usdInvs.length} customer${usdInvs.length !== 1 ? 's' : ''}`} />
            <MetricCard label="USD Returned"    value={`$${fmt(usdReturned, 'USD')}`}  color="text-emerald-600" />
            <MetricCard label="USD Outstanding" value={`$${fmt(Math.max(0, usdPrincipal - usdReturned), 'USD')}`} color="text-red-600" />
          </>
        )}
        <MetricCard label="Active Loans" value={String(activeCount)} sub={`of ${filtered.length} shown`} />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-20 text-center text-gray-400">
          <HandCoins className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{investments.length === 0 ? 'No investments yet' : 'No results match filters'}</p>
          <p className="text-sm mt-1">{investments.length === 0 ? 'Click "Add Investment" to record your first loan' : 'Clear filters to see all loans'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className={`${thCls} text-left`} onClick={() => handleSortClick('customerName')}>
                    <div className="flex items-center gap-1">Customer <SortIcon field="customerName" active={sortField === 'customerName'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-left`} onClick={() => handleSortClick('dateGiven')}>
                    <div className="flex items-center gap-1">Date Given <SortIcon field="dateGiven" active={sortField === 'dateGiven'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('principal')}>
                    <div className="flex items-center justify-end gap-1">Principal <SortIcon field="principal" active={sortField === 'principal'} dir={sortDir} /></div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Returned</th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('outstanding')}>
                    <div className="flex items-center justify-end gap-1">Outstanding <SortIcon field="outstanding" active={sortField === 'outstanding'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-center`} onClick={() => handleSortClick('interestRate')}>
                    <div className="flex items-center justify-center gap-1">Rate <SortIcon field="interestRate" active={sortField === 'interestRate'} dir={sortDir} /></div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(inv => {
                  const totalReturned = inv.returns.reduce((s, r) => s + r.amount, 0);
                  const outstanding   = Math.max(0, inv.principal - totalReturned);
                  const status        = statusInfo(inv);
                  const isExpanded    = expanded === inv.id;
                  const s             = sym(inv.currency);

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-800">{inv.customerName}</p>
                            {inv.notes && <p className="text-xs text-gray-400 truncate max-w-[180px]">{inv.notes}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>
                            <p>{new Date(inv.dateGiven).toLocaleDateString('en-IN')}</p>
                            <p className="text-xs text-gray-400">{daysSince(inv.dateGiven)}d ago</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{s}{fmt(inv.principal, inv.currency)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">{s}{fmt(totalReturned, inv.currency)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">{s}{fmt(outstanding, inv.currency)}</td>
                        <td className="px-4 py-3 text-center text-gray-500">
                          {inv.interestRate != null ? `${inv.interestRate}% p.a.` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setReturnFor(inv)}
                              title="Record Return"
                              disabled={outstanding <= 0}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowDownCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setExpanded(isExpanded ? null : inv.id)}
                              title={isExpanded ? 'Hide returns' : 'Show returns'}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {deleteConfirm === inv.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(inv.id)}
                                  className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg font-medium hover:bg-red-700">Confirm</button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  className="text-xs border border-gray-200 px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-50">Cancel</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(inv.id)}
                                title="Delete"
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-6 pb-4 pt-0 bg-gray-50">
                            {inv.returns.length === 0 ? (
                              <p className="text-xs text-gray-400 py-2">No returns recorded yet.</p>
                            ) : (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Return History</p>
                                {inv.returns.map((r, i) => (
                                  <div key={r.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs">
                                    <span className="text-gray-500">#{i + 1} — {new Date(r.date).toLocaleDateString('en-IN')}</span>
                                    <span className="font-semibold text-emerald-600">{s}{fmt(r.amount, inv.currency)}</span>
                                    {r.notes && <span className="text-gray-400 italic truncate max-w-[200px]">{r.notes}</span>}
                                  </div>
                                ))}
                                <div className="flex justify-end text-xs font-semibold text-gray-700 pt-1">
                                  Total returned: {s}{fmt(totalReturned, inv.currency)}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddLoan && <AddLoanModal onSave={handleAddInvestment} onClose={() => setShowAddLoan(false)} />}
      {returnFor   && <AddReturnModal investment={returnFor} onSave={handleAddReturn} onClose={() => setReturnFor(null)} />}
    </div>
  );
}
