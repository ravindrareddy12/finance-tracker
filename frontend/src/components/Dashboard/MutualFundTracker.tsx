import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, RefreshCw, Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, CalendarPlus, CalendarClock, Pencil, Download, Pause, X as XIcon, Play, SquarePen, Receipt, FileSpreadsheet } from 'lucide-react';
import { downloadExcel } from '../../utils/exportExcel';
import axios from 'axios';
import { MFHolding, MFTransaction, SIPSchedule } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { computeXIRR } from '../../services/xirr';
import { collectDueDates, advanceDueDate } from '../../utils/sipUtils';
import AddMFHoldingModal from '../Modals/AddMFHoldingModal';
import AddMFTransactionModal from '../Modals/AddMFTransactionModal';
import AddSIPModal from '../Modals/AddSIPModal';
import AddFutureSIPModal from '../Modals/AddFutureSIPModal';
import MFExcelImportModal from '../Modals/MFExcelImportModal';

function storageKey(user: string) { return `ft_mf_${user}`; }
function loadHoldings(user: string): MFHolding[] {
  try { return JSON.parse(localStorage.getItem(storageKey(user)) || '[]'); }
  catch { return []; }
}
function saveHoldings(user: string, data: MFHolding[]) {
  localStorage.setItem(storageKey(user), JSON.stringify(data));
}

function sipKey(user: string) { return `ft_sip_schedules_${user}`; }
function loadSchedules(user: string): SIPSchedule[] {
  try { return JSON.parse(localStorage.getItem(sipKey(user)) || '[]'); }
  catch { return []; }
}
function saveSchedules(user: string, data: SIPSchedule[]) {
  localStorage.setItem(sipKey(user), JSON.stringify(data));
}

interface NAVData {
  schemeCode: string;
  currentNAV: number;
  navDate: string;
  previousNAV: number | null;
  schemeName: string;
  amcName?: string;
  category?: string;
}

function fmt(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function computeHoldingStats(h: MFHolding, nav: NAVData | null) {
  const totalUnits = h.transactions.reduce(
    (s, t) => t.type === 'buy' ? s + t.units : s - t.units, 0
  );
  const totalInvested = h.transactions.reduce(
    (s, t) => t.type === 'buy' ? s + t.amount : s, 0
  );
  const currentNAV     = nav?.currentNAV ?? null;
  const currentValue   = currentNAV != null ? totalUnits * currentNAV : null;
  const gain           = currentValue != null ? currentValue - totalInvested : null;
  const gainPct        = totalInvested > 0 && gain != null ? (gain / totalInvested) * 100 : null;
  const avgNAV         = totalUnits > 0 ? totalInvested / totalUnits : null;

  // XIRR
  let xirr: number | null = null;
  if (currentValue != null && h.transactions.length > 0) {
    const cashflows = [
      ...h.transactions.map(t => ({
        amount: t.type === 'buy' ? -t.amount : t.amount,
        date:   new Date(t.date),
      })),
      { amount: currentValue, date: new Date() },
    ];
    xirr = computeXIRR(cashflows);
  }

  return { totalUnits, totalInvested, currentNAV, currentValue, gain, gainPct, avgNAV, xirr };
}

type SortField = 'fundName' | 'totalInvested' | 'currentValue' | 'gain' | 'xirr' | 'avgNAV';
type SortDir   = 'asc' | 'desc';

interface MetricCardProps { label: string; value: string; sub?: string; color?: string; badge?: string; badgeColor?: string; }
function MetricCard({ label, value, sub, color = 'text-gray-800', badge, badgeColor = 'bg-gray-100 text-gray-600' }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-end gap-2 flex-wrap">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {badge && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-0.5 ${badgeColor}`}>{badge}</span>}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return dir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />;
}

export default function MutualFundTracker() {
  const { currentUser } = useAuth();
  const user = currentUser ?? 'default';

  const [holdings,       setHoldings]       = useState<MFHolding[]>(() => loadHoldings(user));
  const [navMap,         setNavMap]         = useState<Record<string, NAVData>>({});
  const [navLoading,     setNavLoading]     = useState(false);
  const [lastRefreshed,  setLastRefreshed]  = useState<Date | null>(null);

  const [sipSchedules,    setSipSchedules]    = useState<SIPSchedule[]>(() => loadSchedules(user));
  const [sipProcessing,   setSipProcessing]   = useState(false);

  const [showAddHolding,  setShowAddHolding]  = useState(false);
  const [showImport,      setShowImport]      = useState(false);
  const [txFor,           setTxFor]           = useState<MFHolding | null>(null);
  const [sipFor,          setSipFor]          = useState<MFHolding | null>(null);
  const [futureSipFor,    setFutureSipFor]    = useState<MFHolding | null>(null);
  const [editSip,         setEditSip]         = useState<SIPSchedule | null>(null);
  const [expanded,        setExpanded]        = useState<string | null>(null);
  const [deleteConfirm,   setDeleteConfirm]   = useState<string | null>(null);
  const [editTx,          setEditTx]          = useState<{ holding: MFHolding; tx: MFTransaction } | null>(null);
  const [deleteTxConfirm, setDeleteTxConfirm] = useState<string | null>(null); // txId

  const [search,    setSearch]    = useState('');
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');
  const [showAllTx, setShowAllTx] = useState(false);

  const persist = (data: MFHolding[]) => { setHoldings(data); saveHoldings(user, data); };
  const persistSchedules = (data: SIPSchedule[]) => { setSipSchedules(data); saveSchedules(user, data); };

  // Process due SIP schedules on mount
  useEffect(() => {
    const active = sipSchedules.filter(s => s.active);
    if (active.length === 0) return;

    // Collect all due dates across all schedules
    const toProcess: { schedule: SIPSchedule; dates: string[] }[] = [];
    active.forEach(s => {
      const dates = collectDueDates(s);
      if (dates.length > 0) toProcess.push({ schedule: s, dates });
    });
    if (toProcess.length === 0) return;

    setSipProcessing(true);
    (async () => {
      try {
        // Gather all unique (schemeCode, date) pairs
        const allDatesByCode: Record<string, Set<string>> = {};
        toProcess.forEach(({ schedule, dates }) => {
          if (!allDatesByCode[schedule.schemeCode]) allDatesByCode[schedule.schemeCode] = new Set();
          dates.forEach(d => allDatesByCode[schedule.schemeCode].add(d));
        });

        // Fetch NAVs for each scheme
        const navResults: Record<string, Record<string, number>> = {};
        await Promise.all(Object.entries(allDatesByCode).map(async ([code, datesSet]) => {
          try {
            const r = await axios.get('/api/mf/nav-on-dates', {
              params: { code, dates: [...datesSet].join(',') },
            });
            navResults[code] = {};
            (r.data?.results ?? []).forEach((item: { navDate: string; nav: number }) => {
              navResults[code][item.navDate] = item.nav;
            });
          } catch { /* skip if unavailable */ }
        }));

        // Build new transactions and advance schedules
        let updatedHoldings = loadHoldings(user);
        const updatedSchedules = sipSchedules.map(s => ({ ...s }));

        toProcess.forEach(({ schedule, dates }) => {
          const codeNavs = navResults[schedule.schemeCode] ?? {};
          const newTxs: MFTransaction[] = [];

          dates.forEach(date => {
            const nav = codeNavs[date];
            if (!nav) return; // skip if no NAV available for this date
            const units = parseFloat((schedule.amount / nav).toFixed(3));
            newTxs.push({
              id:     `sip_auto_${schedule.id}_${date}`,
              type:   'buy',
              date,
              units,
              nav,
              amount: schedule.amount,
              notes:  `SIP (${schedule.frequency})`,
            });
          });

          if (newTxs.length > 0) {
            updatedHoldings = updatedHoldings.map(h =>
              h.id === schedule.fundId
                ? { ...h, transactions: [...h.transactions, ...newTxs] }
                : h
            );
          }

          // Advance nextDueDate past all processed dates
          const idx = updatedSchedules.findIndex(s => s.id === schedule.id);
          if (idx !== -1) {
            let next = schedule.nextDueDate;
            dates.forEach(() => { next = advanceDueDate(next, schedule.frequency, schedule.dayOfMonth); });
            updatedSchedules[idx] = {
              ...updatedSchedules[idx],
              nextDueDate:       next,
              lastProcessedDate: dates[dates.length - 1],
              active:            next <= schedule.endDate,
            };
          }
        });

        persist(updatedHoldings);
        persistSchedules(updatedSchedules);
      } finally {
        setSipProcessing(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFutureSIPSave = (schedule: SIPSchedule) => {
    persistSchedules([...sipSchedules, schedule]);
    setFutureSipFor(null);
  };

  const handleEditSIPSave = (updated: SIPSchedule) => {
    persistSchedules(sipSchedules.map(s => s.id === updated.id ? updated : s));
    setEditSip(null);
  };

  const handleToggleSIP = (id: string) => {
    persistSchedules(sipSchedules.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const handleDeleteSIP = (id: string) => {
    persistSchedules(sipSchedules.filter(s => s.id !== id));
  };

  // Fetch live NAVs
  const fetchNAVs = useCallback(async (list: MFHolding[]) => {
    if (list.length === 0) return;
    setNavLoading(true);
    try {
      const codes = list.map(h => h.schemeCode).join(',');
      const r = await axios.get(`/api/mf/nav?codes=${codes}`);
      const map: Record<string, NAVData> = {};
      (r.data?.results ?? []).forEach((nav: NAVData) => { map[nav.schemeCode] = nav; });
      setNavMap(map);
      setLastRefreshed(new Date());
    } catch { /* silent fail */ }
    finally { setNavLoading(false); }
  }, []);

  useEffect(() => { fetchNAVs(holdings); }, [holdings.length]); // eslint-disable-line

  const handleAddHolding = (h: MFHolding) => {
    const newList = [...holdings, h];
    persist(newList);
    setShowAddHolding(false);
    fetchNAVs(newList);
  };

  const handleAddTransaction = (tx: MFTransaction) => {
    if (!txFor) return;
    const newList = holdings.map(h => h.id === txFor.id ? { ...h, transactions: [...h.transactions, tx] } : h);
    persist(newList);
    setTxFor(null);
  };

  const handleSIPSave = (transactions: MFTransaction[]) => {
    if (!sipFor) return;
    const newList = holdings.map(h =>
      h.id === sipFor.id ? { ...h, transactions: [...h.transactions, ...transactions] } : h
    );
    persist(newList);
    setSipFor(null);
  };

  const handleDelete = (id: string) => {
    persist(holdings.filter(h => h.id !== id));
    setDeleteConfirm(null);
  };

  const handleDeleteTransaction = (holdingId: string, txId: string) => {
    const newList = holdings.map(h =>
      h.id === holdingId ? { ...h, transactions: h.transactions.filter(t => t.id !== txId) } : h
    );
    persist(newList);
    setDeleteTxConfirm(null);
  };

  const handleUpdateTransaction = (holdingId: string, updated: MFTransaction) => {
    const newList = holdings.map(h =>
      h.id === holdingId
        ? { ...h, transactions: h.transactions.map(t => t.id === updated.id ? updated : t) }
        : h
    );
    persist(newList);
    setEditTx(null);
  };

  const handleSortClick = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Compute stats for each holding
  const holdingsWithStats = useMemo(() =>
    holdings.map(h => ({
      holding: h,
      stats:   computeHoldingStats(h, navMap[h.schemeCode] ?? null),
    })),
    [holdings, navMap]
  );

  // Portfolio totals
  const totalInvested = holdingsWithStats.reduce((s, { stats }) => s + stats.totalInvested, 0);
  const totalCurrent  = holdingsWithStats.reduce((s, { stats }) => s + (stats.currentValue ?? stats.totalInvested), 0);
  const totalGain     = totalCurrent - totalInvested;
  const totalGainPct  = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const todayNet      = 0; // removed today's change column

  // Overall XIRR across all holdings
  const overallXIRR = useMemo(() => {
    const cashflows: { amount: number; date: Date }[] = [];
    holdingsWithStats.forEach(({ holding, stats }) => {
      holding.transactions.forEach(t => {
        cashflows.push({ amount: t.type === 'buy' ? -t.amount : t.amount, date: new Date(t.date) });
      });
      if (stats.currentValue != null) cashflows.push({ amount: stats.currentValue, date: new Date() });
    });
    if (cashflows.length < 2) return null;
    return computeXIRR(cashflows);
  }, [holdingsWithStats]);

  // Filtered + sorted
  const displayed = useMemo(() => {
    let list = holdingsWithStats;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ holding }) =>
        holding.fundName.toLowerCase().includes(q) ||
        (holding.amcName ?? navMap[holding.schemeCode]?.amcName ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let aVal = 0, bVal = 0;
      switch (sortField) {
        case 'fundName':       return sortDir === 'asc'
          ? a.holding.fundName.localeCompare(b.holding.fundName)
          : b.holding.fundName.localeCompare(a.holding.fundName);
        case 'totalInvested':  aVal = a.stats.totalInvested;  bVal = b.stats.totalInvested;  break;
        case 'currentValue':   aVal = a.stats.currentValue ?? a.stats.totalInvested; bVal = b.stats.currentValue ?? b.stats.totalInvested; break;
        case 'gain':           aVal = a.stats.gain ?? 0;       bVal = b.stats.gain ?? 0;      break;
        case 'xirr':           aVal = a.stats.xirr ?? -999;   bVal = b.stats.xirr ?? -999;   break;
        case 'avgNAV':         aVal = a.stats.avgNAV ?? 0;    bVal = b.stats.avgNAV ?? 0;    break;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [holdingsWithStats, search, sortField, sortDir, navMap]);

  const gainBadgeColor = (v: number) => v >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
  const thCls = 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-indigo-600 transition-colors';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Mutual Funds</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Indian MFs · Live NAV via MFAPI
            {lastRefreshed && <span className="ml-2 text-gray-300">· Last updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => fetchNAVs(holdings)} disabled={navLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${navLoading ? 'animate-spin' : ''}`} />
            {navLoading ? 'Refreshing…' : 'Refresh NAV'}
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Import
          </button>
          <button
            onClick={() => {
              const rows = displayed.map(({ holding, stats }) => ({
                'Fund Name': holding.fundName,
                AMC: holding.amcName ?? navMap[holding.schemeCode]?.amcName ?? '',
                'Scheme Code': holding.schemeCode,
                'Current NAV': stats.currentNAV ?? '',
                Units: +stats.totalUnits.toFixed(3),
                'Total Invested': +stats.totalInvested.toFixed(2),
                'Current Value': stats.currentValue != null ? +stats.currentValue.toFixed(2) : '',
                'Avg NAV': stats.avgNAV != null ? +stats.avgNAV.toFixed(4) : '',
                'Gain': stats.gain != null ? +stats.gain.toFixed(2) : '',
                'Gain %': stats.gainPct != null ? +stats.gainPct.toFixed(2) : '',
                'XIRR %': stats.xirr != null ? +stats.xirr.toFixed(2) : '',
              }));
              downloadExcel(rows, 'mutual-funds', 'Mutual Funds');
            }}
            disabled={displayed.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => setShowAllTx(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${showAllTx ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            <Receipt className="w-3.5 h-3.5" />
            {showAllTx ? 'Hide Transactions' : 'Transactions'}
          </button>
          <button onClick={() => setShowAddHolding(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Fund
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard label="Total Invested" value={`₹${fmt(totalInvested)}`} sub={`${holdings.length} fund${holdings.length !== 1 ? 's' : ''}`} />
        <MetricCard label="Current Value" value={`₹${fmt(totalCurrent)}`}
          color={totalCurrent >= totalInvested ? 'text-emerald-600' : 'text-red-600'} />
        <MetricCard label="Total Gain"
          value={`${totalGain >= 0 ? '+' : ''}₹${fmt(Math.abs(totalGain))}`}
          color={totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'}
          badge={`${totalGain >= 0 ? '+' : ''}${totalGainPct.toFixed(1)}%`}
          badgeColor={gainBadgeColor(totalGain)} />
        <MetricCard label="Today's Change"
          value={`${todayNet >= 0 ? '+' : ''}₹${fmt(Math.abs(todayNet))}`}
          color={todayNet >= 0 ? 'text-emerald-600' : 'text-red-600'}
          sub={navLoading ? 'Fetching…' : undefined} />
        <MetricCard label="Overall XIRR"
          value={overallXIRR != null ? `${overallXIRR.toFixed(2)}% p.a.` : '—'}
          color={overallXIRR != null ? (overallXIRR >= 0 ? 'text-indigo-600' : 'text-red-600') : 'text-gray-500'} />
      </div>

      {/* All Transactions Panel */}
      {showAllTx && (() => {
        const allTx = holdings.flatMap(h =>
          h.transactions.map(tx => ({ ...tx, fundName: h.fundName, holdingId: h.id }))
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totalBuy  = allTx.filter(t => t.type === 'buy').reduce((s, t) => s + t.amount, 0);
        const totalSell = allTx.filter(t => t.type === 'sell').reduce((s, t) => s + t.amount, 0);
        return (
          <div className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-indigo-50/40">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-700">All Transactions</h3>
                <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">{allTx.length}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Invested: <span className="font-semibold text-gray-700">₹{fmt(totalBuy)}</span></span>
                {totalSell > 0 && <span>Redeemed: <span className="font-semibold text-red-600">₹{fmt(totalSell)}</span></span>}
              </div>
            </div>
            {allTx.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No transactions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fund</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Units</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">NAV</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allTx.map((tx, i) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-gray-400">{allTx.length - i}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[200px]">
                          <span className="line-clamp-1 font-medium">{tx.fundName}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${tx.type === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-gray-700">{tx.units.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-gray-700">₹{tx.nav}</td>
                        <td className={`px-4 py-2.5 text-right text-xs font-semibold ${tx.type === 'buy' ? 'text-gray-800' : 'text-red-600'}`}>
                          ₹{fmt(tx.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 italic max-w-[160px]">
                          <span className="line-clamp-1">{tx.notes ?? ''}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Search fund / AMC…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-52" />
        </div>
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <select value={sortField} onChange={e => { setSortField(e.target.value as SortField); setSortDir('desc'); }}
            className="text-xs border-none outline-none bg-transparent text-gray-600 cursor-pointer">
            <option value="currentValue">Current Value</option>
            <option value="fundName">Fund Name</option>
            <option value="totalInvested">Invested</option>
            <option value="gain">Gain</option>
            <option value="xirr">XIRR</option>
            <option value="avgNAV">Avg NAV</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="ml-1 text-indigo-600">
            {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        {displayed.length < holdings.length && (
          <span className="text-xs text-gray-400">{displayed.length} of {holdings.length} shown</span>
        )}
      </div>

      {/* Table */}
      {holdings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-20 text-center text-gray-400">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No mutual funds yet</p>
          <p className="text-sm mt-1">Click "Add Fund" to start tracking</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className={`${thCls} text-left`} onClick={() => handleSortClick('fundName')}>
                    <div className="flex items-center gap-1">Fund <SortIcon active={sortField === 'fundName'} dir={sortDir} /></div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">NAV</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Units</th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('totalInvested')}>
                    <div className="flex items-center justify-end gap-1">Invested <SortIcon active={sortField === 'totalInvested'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('currentValue')}>
                    <div className="flex items-center justify-end gap-1">Current Value <SortIcon active={sortField === 'currentValue'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('avgNAV')}>
                    <div className="flex items-center justify-end gap-1">Avg NAV <SortIcon active={sortField === 'avgNAV'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('gain')}>
                    <div className="flex items-center justify-end gap-1">Gain <SortIcon active={sortField === 'gain'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('xirr')}>
                    <div className="flex items-center justify-end gap-1">XIRR <SortIcon active={sortField === 'xirr'} dir={sortDir} /></div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">% of Portfolio</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map(({ holding, stats }) => {
                  const navInfo  = navMap[holding.schemeCode];
                  const isExp    = expanded === holding.id;
                  const pct      = totalCurrent > 0 && stats.currentValue != null
                    ? (stats.currentValue / totalCurrent) * 100 : 0;
                  const amcName  = holding.amcName ?? navInfo?.amcName ?? '';

                  return (
                    <React.Fragment key={holding.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        {/* Fund Name */}
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="font-semibold text-gray-800 text-xs leading-snug line-clamp-2">{holding.fundName}</p>
                          {amcName && <p className="text-xs text-gray-400 mt-0.5 truncate">{amcName}</p>}
                          {navInfo?.category && <p className="text-xs text-indigo-400 truncate">{navInfo.category}</p>}
                        </td>
                        {/* NAV */}
                        <td className="px-4 py-3 text-right">
                          {navLoading && !stats.currentNAV ? (
                            <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin ml-auto" />
                          ) : stats.currentNAV != null ? (
                            <div>
                              <p className="font-semibold text-gray-800">₹{stats.currentNAV.toFixed(4)}</p>
                              {navInfo?.navDate && <p className="text-xs text-gray-400">{navInfo.navDate}</p>}
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        {/* Units */}
                        <td className="px-4 py-3 text-right text-gray-700">{stats.totalUnits.toFixed(3)}</td>
                        {/* Invested */}
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">₹{fmt(stats.totalInvested)}</td>
                        {/* Current Value */}
                        <td className="px-4 py-3 text-right">
                          <p className={`font-bold ${(stats.gain ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {stats.currentValue != null ? `₹${fmt(stats.currentValue)}` : '—'}
                          </p>
                        </td>
                        {/* Avg NAV */}
                        <td className="px-4 py-3 text-right">
                          {stats.avgNAV != null
                            ? <span className="text-gray-700 font-medium">₹{stats.avgNAV.toFixed(4)}</span>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        {/* Gain */}
                        <td className="px-4 py-3 text-right">
                          {stats.gain != null ? (
                            <div>
                              <p className={`font-semibold ${stats.gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {stats.gain >= 0 ? '+' : ''}₹{fmt(Math.abs(stats.gain))}
                              </p>
                              {stats.gainPct != null && (
                                <p className={`text-xs ${stats.gainPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {stats.gainPct >= 0 ? '+' : ''}{stats.gainPct.toFixed(1)}%
                                </p>
                              )}
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        {/* XIRR */}
                        <td className="px-4 py-3 text-right">
                          {stats.xirr != null ? (
                            <span className={`font-semibold text-sm ${stats.xirr >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                              {stats.xirr.toFixed(1)}%
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        {/* % of Portfolio */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 w-10 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setTxFor(holding)} title="Add Transaction"
                              className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                              <Plus className="w-4 h-4" />
                            </button>
                            <button onClick={() => setSipFor(holding)} title="Add Historical SIP"
                              className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors">
                              <CalendarPlus className="w-4 h-4" />
                            </button>
                            <button onClick={() => setFutureSipFor(holding)} title="Setup Future SIP"
                              className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-colors">
                              <CalendarClock className="w-4 h-4" />
                            </button>
                            <button onClick={() => setExpanded(isExp ? null : holding.id)} title="Transaction history"
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                              {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {deleteConfirm === holding.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(holding.id)}
                                  className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg font-medium hover:bg-red-700">Confirm</button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  className="text-xs border border-gray-200 px-2 py-1 rounded-lg text-gray-500">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(holding.id)} title="Delete"
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded: transaction history */}
                      {isExp && (
                        <tr>
                          <td colSpan={10} className="px-6 pb-4 pt-0 bg-gray-50">
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Transaction History</p>
                              {holding.transactions.length === 0 ? (
                                <p className="text-xs text-gray-400">No transactions.</p>
                              ) : (
                                <div className="space-y-1">
                                  {[...holding.transactions]
                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    .map((tx, i) => (
                                    <div key={tx.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs group">
                                      <span className="text-gray-400 w-4 shrink-0">{i + 1}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0 ${tx.type === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {tx.type}
                                      </span>
                                      <span className="text-gray-500 shrink-0">{new Date(tx.date).toLocaleDateString('en-IN')}</span>
                                      <span className="text-gray-700">{tx.units.toFixed(3)} units @ ₹{tx.nav}</span>
                                      <span className="font-semibold text-gray-800 ml-auto shrink-0">₹{fmt(tx.amount)}</span>
                                      {tx.notes && <span className="text-gray-400 italic shrink-0">{tx.notes}</span>}
                                      {/* Edit / Delete */}
                                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => setEditTx({ holding, tx })}
                                          className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                          title="Edit transaction"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        {deleteTxConfirm === tx.id ? (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleDeleteTransaction(holding.id, tx.id)}
                                              className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-medium hover:bg-red-700"
                                            >Confirm</button>
                                            <button
                                              onClick={() => setDeleteTxConfirm(null)}
                                              className="text-[10px] border border-gray-200 px-2 py-0.5 rounded text-gray-500"
                                            >Cancel</button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setDeleteTxConfirm(tx.id)}
                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete transaction"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  <div className="flex justify-between text-xs font-semibold text-gray-700 pt-1 px-1">
                                    <span>Total units: {stats.totalUnits.toFixed(3)}</span>
                                    <span>Total invested: ₹{fmt(stats.totalInvested)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {/* Totals footer */}
              {holdings.length > 1 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-gray-600">Total ({holdings.length} funds)</td>
                    <td className="px-4 py-3 text-right text-gray-800">₹{fmt(totalInvested)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${totalCurrent >= totalInvested ? 'text-emerald-600' : 'text-red-600'}`}>₹{fmt(totalCurrent)}</td>
                    <td />
                    <td className={`px-4 py-3 text-right ${totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {totalGain >= 0 ? '+' : ''}₹{fmt(Math.abs(totalGain))}
                      <span className="ml-1 text-xs">({totalGain >= 0 ? '+' : ''}{totalGainPct.toFixed(1)}%)</span>
                    </td>
                    <td className={`px-4 py-3 text-right ${(overallXIRR ?? 0) >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                      {overallXIRR != null ? `${overallXIRR.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs pr-6">100%</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* SIP Schedules section */}
      {sipSchedules.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-700">SIP Schedules</h3>
              {sipProcessing && <span className="text-xs text-indigo-400 animate-pulse">Processing…</span>}
            </div>
            <span className="text-xs text-gray-400">{sipSchedules.filter(s => s.active).length} active</span>
          </div>
          <div className="divide-y divide-gray-100">
            {sipSchedules.map(s => (
              <div key={s.id} className={`flex items-center gap-4 px-5 py-3 text-sm ${s.active ? '' : 'opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-xs truncate">{s.fundName}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span>₹{s.amount.toLocaleString('en-IN')} / {s.frequency}</span>
                    <span>·</span>
                    <span>Next: {s.active ? new Date(s.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Paused / Ended'}</span>
                    <span>·</span>
                    <span>Until {new Date(s.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {s.notes && <><span>·</span><span className="italic truncate max-w-[120px]">{s.notes}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditSip(s)} title="Edit SIP schedule"
                    className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-colors">
                    <SquarePen className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleToggleSIP(s.id)}
                    title={s.active ? 'Pause SIP' : 'Resume SIP'}
                    className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                    {s.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleDeleteSIP(s.id)} title="Remove SIP schedule"
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddHolding && <AddMFHoldingModal onSave={handleAddHolding} onClose={() => setShowAddHolding(false)} />}
      {showImport && (
        <MFExcelImportModal
          holdings={holdings}
          onImport={updated => { persist(updated); setShowImport(false); fetchNAVs(updated); }}
          onClose={() => setShowImport(false)}
        />
      )}
      {txFor && (
        <AddMFTransactionModal
          holding={txFor}
          currentNAV={navMap[txFor.schemeCode]?.currentNAV}
          onSave={handleAddTransaction}
          onClose={() => setTxFor(null)}
        />
      )}
      {editTx && (
        <AddMFTransactionModal
          holding={editTx.holding}
          currentNAV={navMap[editTx.holding.schemeCode]?.currentNAV}
          initial={editTx.tx}
          onSave={updated => handleUpdateTransaction(editTx.holding.id, updated)}
          onClose={() => setEditTx(null)}
        />
      )}
      {sipFor && (
        <AddSIPModal
          holding={sipFor}
          onSave={handleSIPSave}
          onClose={() => setSipFor(null)}
        />
      )}
      {futureSipFor && (
        <AddFutureSIPModal
          holding={futureSipFor}
          onSave={handleFutureSIPSave}
          onClose={() => setFutureSipFor(null)}
        />
      )}
      {editSip && (
        <AddFutureSIPModal
          holding={{ id: editSip.fundId, schemeCode: editSip.schemeCode, fundName: editSip.fundName, transactions: [] }}
          initial={editSip}
          onSave={handleEditSIPSave}
          onClose={() => setEditSip(null)}
        />
      )}
    </div>
  );
}
