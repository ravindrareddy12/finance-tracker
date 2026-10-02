import React, { useState, useMemo, useEffect } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { getAccountColors } from '../../utils/accountColors';
import { Holding, DematAccount } from '../../types';
import {
  TrendingUp, RefreshCw, Plus, Minus,
  ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown,
  ChevronsUpDown, Search, X, FileSpreadsheet, Download, ChevronDown as ChevronDownIcon,
  BarChart2, PieChart, List, Maximize,
} from 'lucide-react';
import { downloadExcel } from '../../utils/exportExcel';
import BuyModal from '../Modals/BuyModal';
import SellModal from '../Modals/SellModal';
import UploadModal from '../Modals/UploadModal';
import CashBalanceSection from './CashBalanceSection';
import ChartModal from './ChartModal';
import TransactionsList from './TransactionsList';

// ─── Allocation palette + donut ───────────────────────────────────────────────

const ALLOC_PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
  '#a855f7','#64748b','#e11d48','#0ea5e9','#22c55e',
];

const AR = 64, AS = 26, AC = 90, ACIRC = 2 * Math.PI * AR;

function AllocDonut({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  let cum = 0;
  const arcs = segments.map(s => {
    const rotation = (cum / 100) * 360 - 90;
    const dash = (s.pct / 100) * ACIRC;
    cum += s.pct;
    return { ...s, rotation, dash };
  });
  const active = hovered ? segments.find(s => s.label === hovered) : null;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      <svg width={200} height={200} viewBox="0 0 180 180">
        <circle cx={AC} cy={AC} r={AR} fill="none" stroke="#f1f5f9" strokeWidth={AS} />
        {arcs.map(arc => (
          <circle key={arc.label} cx={AC} cy={AC} r={AR} fill="none"
            stroke={arc.color}
            strokeWidth={hovered === arc.label ? AS + 4 : AS}
            strokeDasharray={`${arc.dash} ${ACIRC - arc.dash}`}
            strokeDashoffset={0}
            transform={`rotate(${arc.rotation} ${AC} ${AC})`}
            style={{ transition: 'stroke-width 0.15s', cursor: 'pointer' }}
            onMouseEnter={() => setHovered(arc.label)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {active ? (
          <>
            <span className="text-xs font-bold text-gray-700 leading-tight">{active.label}</span>
            <span className="text-lg font-bold" style={{ color: active.color }}>{active.pct.toFixed(1)}%</span>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-400">Portfolio</span>
            <span className="text-lg font-bold text-gray-700">{segments.length} stocks</span>
          </>
        )}
      </div>
    </div>
  );
}

function AllocationSectionToggle({ holdings, dematAccounts, currencyFilter }: {
  holdings: Holding[];
  dematAccounts: string[];
  currencyFilter?: 'INR' | 'USD';
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-gray-200">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-1 py-3 text-left group"
      >
        <div className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 transition-colors text-white px-4 py-2 rounded-lg">
          <Maximize className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-semibold">
            View Allocation Breakdown
          </span>
          <span className="text-xs text-teal-100 font-normal">({holdings.length} holdings)</span>
          {open
            ? <ChevronUp className="w-4 h-4 text-teal-100 ml-1" />
            : <ChevronDown className="w-4 h-4 text-teal-100 ml-1" />}
        </div>
      </button>
      {open && (
        <div className="pb-6">
          <AllocationSection holdings={holdings} dematAccounts={dematAccounts} currencyFilter={currencyFilter} />
        </div>
      )}
    </div>
  );
}

function AllocationSection({ holdings, dematAccounts, currencyFilter }: {
  holdings: Holding[];
  dematAccounts: string[];
  currencyFilter?: 'INR' | 'USD';
}) {
  const totalValue = holdings.reduce((s, h) => s + (h.currentValue ?? 0), 0);
  const sym = currencyFilter === 'INR' ? '₹' : '$';
  const locale = currencyFilter === 'INR' ? 'en-IN' : 'en-US';

  const rows = useMemo(() => {
    const map = new Map<string, { symbol: string; company: string; accounts: Set<string>; currentValue: number }>();
    holdings.forEach(h => {
      const ex = map.get(h.symbol);
      if (ex) { ex.currentValue += h.currentValue ?? 0; ex.accounts.add(h.dematAccount); }
      else map.set(h.symbol, { symbol: h.symbol, company: h.companyName, accounts: new Set([h.dematAccount]), currentValue: h.currentValue ?? 0 });
    });
    return [...map.values()]
      .map((r, i) => ({
        ...r,
        dematAccount: r.accounts.size === 1 ? [...r.accounts][0] : 'Multiple',
        pct: totalValue > 0 ? (r.currentValue / totalValue) * 100 : 0,
        color: ALLOC_PALETTE[i % ALLOC_PALETTE.length],
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [holdings, totalValue]);

  const donutSegments = useMemo(() => {
    const main = rows.filter(r => r.pct >= 1);
    const small = rows.filter(r => r.pct < 1);
    const result = main.map(r => ({ label: r.symbol, pct: r.pct, color: r.color }));
    if (small.length > 0) result.push({ label: 'Others', pct: small.reduce((s, r) => s + r.pct, 0), color: '#94a3b8' });
    return result;
  }, [rows]);

  if (holdings.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            const data = rows.map((r, i) => ({
              '#': i + 1,
              Symbol: r.symbol,
              Company: r.company,
              'Demat Account': r.dematAccount,
              'Current Value': +r.currentValue.toFixed(2),
              'Allocation %': +r.pct.toFixed(2),
            }));
            downloadExcel(data, `allocation-${currencyFilter ?? 'all'}`, 'Allocation');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Donut */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4 lg:w-72 shrink-0">
          <AllocDonut segments={donutSegments} />
          <div className="w-full space-y-1.5 max-h-48 overflow-y-auto">
            {donutSegments.map(s => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-gray-600 font-mono font-semibold">{s.label}</span>
                </div>
                <span className="font-semibold text-gray-700">{s.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Demat</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={r.symbol} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                        <span className="font-mono font-semibold text-blue-700">{r.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate" title={r.company}>{r.company}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAccountColors(r.dematAccount, dematAccounts).badge}`}>
                        {r.dematAccount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {sym}{r.currentValue.toLocaleString(locale, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(r.pct, 100)}%`, background: r.color }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-12 text-right">{r.pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right text-gray-800">
                    {sym}{totalValue.toLocaleString(locale, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs pr-6">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


type SortKey = keyof Holding | null;
type SortDir = 'asc' | 'desc';

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-xs">—</span>;
  const isPos = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isPos ? 'text-green-600' : 'text-red-500'}`}>
      {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

interface ColDef {
  key: SortKey;
  label: string;
  align?: 'left' | 'right';
}

interface ColDef2 extends ColDef { hideSingleCurrency?: boolean; }

const COLUMNS: ColDef2[] = [
  { key: 'symbol',            label: 'Symbol' },
  { key: 'companyName',       label: 'Company' },
  { key: 'quantity',          label: 'Qty',             align: 'right' },
  { key: 'avgBuyPrice',       label: 'Avg Buy Price',   align: 'right' },
  { key: 'totalInvested',     label: 'Total Invested',  align: 'right' },
  { key: 'currency',          label: 'Currency',        hideSingleCurrency: true },
  { key: 'dematAccount',      label: 'Demat Acc' },
  { key: 'firstBuyDate',      label: 'First Buy Date' },
  { key: 'todayChangePercent',label: "Today's %",       align: 'right' },
  { key: 'currentPrice',      label: 'Current Price',   align: 'right' },
  { key: 'currentValue',      label: 'Current Value',   align: 'right' },
  { key: 'totalProfit',       label: 'Total P&L %',     align: 'right' },
  { key: 'xirr',              label: 'XIRR (Ann.)',     align: 'right' },
  { key: 'portfolioPercent',  label: '% of Portfolio',  align: 'right' },
];

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 opacity-30 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 inline text-blue-600" />
    : <ChevronDown className="w-3 h-3 ml-1 inline text-blue-600" />;
}

function getVal(h: Holding, key: SortKey): string | number {
  if (!key) return '';
  const v = h[key];
  if (v === null || v === undefined) return -Infinity;
  return v as string | number;
}

interface EquityPortfolioProps { currencyFilter?: 'INR' | 'USD'; }

export default function EquityPortfolio({ currencyFilter }: EquityPortfolioProps = {}) {
  const { holdings, transactions, loading, refreshQuotes } = usePortfolio();
  const { config } = useAppConfig();
  const dematAccounts = config.dematAccounts;
  const [showBuy, setShowBuy]                   = useState(false);
  const [showSell, setShowSell]                 = useState(false);
  const [showUpload, setShowUpload]             = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [chartHolding, setChartHolding]         = useState<{ symbol: string; companyName: string; currency: string } | null>(null);
  const [sortKey, setSortKey]           = useState<SortKey>(null);
  const [sortDir, setSortDir]           = useState<SortDir>('asc');
  const [filter, setFilter]             = useState('');
  const [dematFilter, setDematFilter]   = useState<DematAccount | 'All'>('All');

  // Pre-filter by exchange/currency if provided, then demat account filter
  // Always exclude zero-quantity holdings (fully-sold positions)
  const currencyFiltered = useMemo(() => {
    const nonZero = holdings.filter(h => h.quantity > 0);
    return currencyFilter ? nonZero.filter(h => h.currency === currencyFilter) : nonZero;
  }, [holdings, currencyFilter]);

  const dematFiltered = useMemo(() =>
    dematFilter === 'All' ? currencyFiltered : currencyFiltered.filter(h => h.dematAccount === dematFilter),
    [currencyFiltered, dematFilter]
  );

  const totalInvested     = dematFiltered.reduce((s, h) => s + h.totalInvested, 0);
  const totalCurrentValue = dematFiltered.reduce((s, h) => s + (h.currentValue ?? 0), 0);
  const totalProfitPct    = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;
  const inrCount          = dematFiltered.filter(h => h.currency === 'INR').length;
  const usdCount          = dematFiltered.filter(h => h.currency === 'USD').length;

  const realizedPnL = useMemo(() => {
    const filteredTxs = transactions
      .filter(t => !currencyFilter || t.currency === currencyFilter)
      .filter(t => dematFilter === 'All' || t.dematAccount === dematFilter);
    const groups = new Map<string, typeof filteredTxs>();
    filteredTxs.forEach(tx => {
      const k = `${tx.symbol}__${tx.dematAccount}__${tx.currency}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(tx);
    });
    let total = 0;
    groups.forEach(txs => {
      txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let qty = 0, cost = 0;
      for (const tx of txs) {
        if (tx.type === 'buy') { cost += tx.quantity * tx.price; qty += tx.quantity; }
        else if (qty > 0) {
          const avg = cost / qty;
          total += tx.quantity * (tx.price - avg);
          qty -= tx.quantity; cost = avg * qty;
        }
      }
    });
    return total;
  }, [transactions, dematFilter]);

  const unrealizedPnL    = totalCurrentValue - totalInvested;
  const unrealizedPnLPct = totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;
  const realizedPnLPct   = totalInvested > 0 ? (realizedPnL / totalInvested) * 100 : 0;
  const netPnL           = realizedPnL + unrealizedPnL;
  const netPnLPct        = totalInvested > 0 ? (netPnL / totalInvested) * 100 : 0;

  // Today's P&L — absolute change per share × quantity (exact)
  // Falls back to derived formula when regularMarketChange is unavailable
  const todayPnL = dematFiltered.reduce((s, h) => {
    if (h.todayChange !== null) return s + h.todayChange * h.quantity;
    if (h.currentValue !== null && h.todayChangePercent !== null)
      return s + h.currentValue - h.currentValue / (1 + h.todayChangePercent / 100);
    return s;
  }, 0);
  const todayPnLPct = totalCurrentValue > 0 ? (todayPnL / totalCurrentValue) * 100 : 0;

  // Use $ when all/majority holdings are USD, ₹ when INR
  const sym = usdCount >= inrCount && usdCount > 0 ? '$' : '₹';
  const locale = sym === '$' ? 'en-US' : 'en-IN';
  const fmt = (n: number) => Math.abs(n).toLocaleString(locale, { maximumFractionDigits: 2 });

  const handleExport = () => {
    const rows = sorted.map(h => ({
      Symbol: h.symbol,
      Company: h.companyName,
      Quantity: h.quantity,
      'Avg Buy Price': h.avgBuyPrice,
      'Total Invested': h.totalInvested,
      Currency: h.currency,
      'Demat Account': h.dematAccount,
      'First Buy Date': h.firstBuyDate ?? '',
      "Today's %": h.todayChangePercent ?? '',
      'Current Price': h.currentPrice ?? '',
      'Current Value': h.currentValue ?? '',
      'Total P&L %': h.totalProfit ?? '',
      'XIRR %': h.xirr ?? '',
      '% of Portfolio': totalInvested > 0 ? +((h.totalInvested / totalInvested) * 100).toFixed(2) : 0,
    }));
    downloadExcel(rows, `equity-portfolio-${currencyFilter ?? 'all'}`, 'Portfolio');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return dematFiltered;
    return dematFiltered.filter(h =>
      h.symbol.toLowerCase().includes(q) ||
      h.companyName.toLowerCase().includes(q) ||
      h.currency.toLowerCase().includes(q) ||
      h.dematAccount.toLowerCase().includes(q)
    );
  }, [dematFiltered, filter]);


  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = getVal(a, sortKey);
      const bv = getVal(b, sortKey);
      let cmp = 0;
      if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv);
      else cmp = (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);


  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard label="INVESTED"
          value={`${sym}${fmt(totalInvested)}`}
          sub={`${inrCount} INR · ${usdCount} USD`} />
        <MetricCard label="CURRENT"
          value={`${sym}${fmt(totalCurrentValue)}`}
          sub={`${dematFiltered.length} holdings`} />
        <MetricCard label="TODAY'S P&L"
          value={`${todayPnL >= 0 ? '+' : '-'}${sym}${fmt(todayPnL)}`}
          pct={todayPnLPct} today />
        <MetricCard label="REALISED P&L"
          value={`${realizedPnL >= 0 ? '+' : '-'}${sym}${fmt(realizedPnL)}`}
          pct={realizedPnLPct} />
        <MetricCard label="UNREALISED P&L"
          value={`${unrealizedPnL >= 0 ? '+' : '-'}${sym}${fmt(unrealizedPnL)}`}
          pct={unrealizedPnLPct} />
        <MetricCard label="NET P&L"
          value={`${netPnL >= 0 ? '+' : '-'}${sym}${fmt(netPnL)}`}
          pct={netPnLPct} bold />
      </div>

      {/* Cash Balances */}
      <CashBalanceSection currency={currencyFilter ?? 'USD'} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">Equity Portfolio</h2>
          {filtered.length !== holdings.length && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {filtered.length} of {holdings.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Demat account filter */}
          <div className="relative">
            <select
              value={dematFilter}
              onChange={e => setDematFilter(e.target.value as DematAccount | 'All')}
              className={`pl-3 pr-7 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer font-medium ${
                dematFilter === 'All'
                  ? 'border-gray-200 bg-white text-gray-700'
                  : `border-blue-200 ${getAccountColors(dematFilter, dematAccounts).badge}`
              }`}
            >
              <option value="All">All Accounts</option>
              {dematAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Search / filter */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by symbol, company, account…"
              className="pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
            />
            {filter && (
              <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button onClick={refreshQuotes} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Fetching…' : 'Refresh'}
          </button>
          <button onClick={() => setShowTransactions(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors font-medium">
            <List className="w-4 h-4" /> View Transactions
          </button>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium">
            <FileSpreadsheet className="w-4 h-4" /> Upload Excel
          </button>
          <button onClick={() => setShowSell(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            <Minus className="w-4 h-4" /> Sell
          </button>
          <button onClick={handleExport} disabled={sorted.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-40">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowBuy(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium">
            <Plus className="w-4 h-4" /> Buy
          </button>
        </div>
      </div>

      {dematFiltered.length === 0 && filter === '' ? (
        <div className="text-center py-20 text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No holdings yet</p>
          <p className="text-sm mt-1">Click <strong>Buy</strong> to add your first stock</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No results for "{filter}"</p>
          <button onClick={() => setFilter('')} className="text-sm text-blue-600 mt-2 hover:underline">Clear filter</button>
        </div>
      ) : (
        <>
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {COLUMNS.filter(col => !(col.hideSingleCurrency && currencyFilter)).map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`sticky top-0 z-10 bg-gray-50 px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors ${col.align === 'right' ? 'text-right' : 'text-left'} ${sortKey === col.key ? 'text-blue-600 bg-blue-50' : ''}`}
                  >
                    {col.label}
                    <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((h, i) => (
                <HoldingRow
                  key={`${h.symbol}-${h.dematAccount}-${i}`}
                  holding={h}
                  totalInvested={totalInvested}
                  hideCurrency={!!currencyFilter}
                  onOpenChart={() => setChartHolding({ symbol: h.symbol, companyName: h.companyName, currency: h.currency })}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                <td className="px-3 py-3 text-gray-700" colSpan={4}>Totals</td>
                <td className="px-3 py-3 text-gray-800 text-right">
                  {sym}{fmt(totalInvested)}
                </td>
                <td colSpan={currencyFilter ? 4 : 5} />
                <td className="px-3 py-3 text-gray-800 text-right">
                  {sym}{fmt(totalCurrentValue)}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className={totalProfitPct >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {totalProfitPct >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%
                  </span>
                </td>
                <td className="px-3 py-3 text-gray-500 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-1 pt-2 text-xs text-gray-400">
          {sorted.length} holding{sorted.length !== 1 ? 's' : ''}
        </div>
        </>
      )}

      {/* ── Allocation section (collapsible) ── */}
      {dematFiltered.length > 0 && (
        <AllocationSectionToggle
          holdings={dematFiltered}
          dematAccounts={dematAccounts}
          currencyFilter={currencyFilter}
        />
      )}

      {showBuy    && <BuyModal    onClose={() => setShowBuy(false)}    />}
      {showSell   && <SellModal   onClose={() => setShowSell(false)}   />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {chartHolding && (
        <ChartModal
          symbol={chartHolding.symbol}
          companyName={chartHolding.companyName}
          currency={chartHolding.currency}
          onClose={() => setChartHolding(null)}
        />
      )}

      {/* Transactions full-screen modal */}
      {showTransactions && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
          <div className="bg-white flex items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                {currencyFilter === 'INR' ? 'India' : 'US'} Equity Transactions
              </h2>
            </div>
            <button
              onClick={() => setShowTransactions(false)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 bg-gray-50">
            <TransactionsList currencyFilter={currencyFilter} />
          </div>
        </div>
      )}
    </div>
  );
}

function HoldingRow({ holding: h, totalInvested, hideCurrency, onOpenChart }: { holding: Holding; totalInvested: number; hideCurrency?: boolean; onOpenChart?: () => void }) {
  const sym = h.currency === 'INR' ? '₹' : '$';
  const investedPct = totalInvested > 0 ? (h.totalInvested / totalInvested) * 100 : 0;
  return (
    <tr className="hover:bg-blue-50/40 transition-colors">
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-semibold text-blue-700">{h.symbol}</span>
          <button
            onClick={onOpenChart}
            title={`Chart – ${h.symbol}`}
            className="p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
      <td className="px-3 py-3 text-gray-700 max-w-[160px] truncate" title={h.companyName}>{h.companyName}</td>
      <td className="px-3 py-3 text-gray-800 font-medium text-right">{h.quantity.toLocaleString()}</td>
      <td className="px-3 py-3 text-gray-700 text-right">{sym}{h.avgBuyPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
      <td className="px-3 py-3 text-gray-800 font-medium text-right">{sym}{h.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
      {!hideCurrency && (
        <td className="px-3 py-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${h.currency === 'INR' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
            {h.currency}
          </span>
        </td>
      )}
      <td className="px-3 py-3">
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{h.dematAccount}</span>
      </td>
      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
        {h.firstBuyDate
          ? new Date(h.firstBuyDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : <span className="text-gray-400">—</span>}
      </td>
      <td className="px-3 py-3 text-right"><PctBadge value={h.todayChangePercent} /></td>
      <td className="px-3 py-3 font-medium text-gray-800 text-right">
        {h.currentPrice !== null
          ? `${sym}${h.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
          : <span className="text-gray-400 text-xs">—</span>}
      </td>
      <td className="px-3 py-3 font-medium text-gray-800 text-right">
        {h.currentValue !== null
          ? `${sym}${h.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
          : <span className="text-gray-400 text-xs">—</span>}
      </td>
      <td className="px-3 py-3 text-right"><PctBadge value={h.totalProfit} /></td>
      <td className="px-3 py-3 text-right">
        {h.xirr !== null
          ? <span className={`text-xs font-semibold ${h.xirr >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {h.xirr >= 0 ? '+' : ''}{h.xirr.toFixed(2)}%
            </span>
          : <span className="text-gray-400 text-xs">—</span>}
      </td>
      <td className="px-3 py-3 text-xs font-medium text-gray-700 text-right">
        {investedPct.toFixed(1)}%
      </td>
    </tr>
  );
}

function MetricCard({ label, value, sub, pct, bold, today }: {
  label: string; value: string; sub?: string; pct?: number; bold?: boolean; today?: boolean;
}) {
  const isPos = pct === undefined || pct >= 0;
  const hasPnL = pct !== undefined;
  const valueColor = hasPnL
    ? today
      ? (isPos ? 'text-amber-600' : 'text-red-500')
      : (isPos ? 'text-green-600' : 'text-red-500')
    : 'text-gray-900';
  const badgeColor = today
    ? (isPos ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600')
    : (isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600');
  return (
    <div className={`bg-white border ${bold ? 'border-gray-300' : today ? 'border-amber-200' : 'border-gray-200'} rounded-xl p-4 shadow-sm`}>
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">{label}</p>
      <p className={`text-lg font-bold leading-tight ${valueColor}`}>{value}</p>
      {hasPnL && (
        <span className={`inline-flex items-center mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
          {isPos ? '+' : ''}{pct!.toFixed(2)}%
        </span>
      )}
      {sub && !hasPnL && (
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      )}
    </div>
  );
}
