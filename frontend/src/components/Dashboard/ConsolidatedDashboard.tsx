import React, { useMemo, useState, useEffect } from 'react';
import { RefreshCw, Download, Droplets, Lock } from 'lucide-react';
import { downloadExcel } from '../../utils/exportExcel';
import axios from 'axios';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAuth } from '../../context/AuthContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { useUSDINR } from '../../hooks/useExchangeRate';
import { RealEstateProperty, LoanInvestment, AdditionalInvestment, MFHolding } from '../../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function reEstimate(p: RealEstateProperty): number {
  const myInv = p.propertyPrice * (p.mySharePercent / 100);
  if (!p.appreciationPerYear || p.appreciationPerYear <= 0) return myInv;
  const yrs = (Date.now() - new Date(p.purchaseDate).getTime()) / (365.25 * 86400000);
  return yrs > 0 ? myInv * Math.pow(1 + p.appreciationPerYear / 100, yrs) : myInv;
}

function addlEstimate(inv: AdditionalInvestment): number {
  if (!inv.interestPercent || inv.interestPercent <= 0) return inv.amountInvested;
  const yrs = (Date.now() - new Date(inv.dateOfInvestment).getTime()) / (365.25 * 86400000);
  return yrs > 0 ? inv.amountInvested * Math.pow(1 + inv.interestPercent / 100, yrs) : inv.amountInvested;
}

// ─── donut chart ──────────────────────────────────────────────────────────────

const RADIUS = 70, STROKE = 28, C = 90, CIRC = 2 * Math.PI * RADIUS;

function DonutChart({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  let cumulative = 0;
  const arcs = segments.map(s => {
    const rotation = (cumulative / 100) * 360 - 90;
    const dash = (s.pct / 100) * CIRC;
    cumulative += s.pct;
    return { ...s, rotation, dash };
  });
  const active = hovered ? segments.find(s => s.label === hovered) : null;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      <svg width={200} height={200} viewBox="0 0 180 180">
        <circle cx={C} cy={C} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
        {arcs.map(arc => (
          <circle key={arc.label} cx={C} cy={C} r={RADIUS} fill="none"
            stroke={arc.color}
            strokeWidth={hovered === arc.label ? STROKE + 4 : STROKE}
            strokeDasharray={`${arc.dash} ${CIRC - arc.dash}`}
            strokeDashoffset={0}
            transform={`rotate(${arc.rotation} ${C} ${C})`}
            style={{ transition: 'stroke-width .15s', cursor: 'pointer' }}
            onMouseEnter={() => setHovered(arc.label)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {active ? (
          <>
            <span className="text-xs font-bold text-gray-700 leading-tight">{active.label}</span>
            <span className="text-xl font-bold" style={{ color: active.color }}>{active.pct.toFixed(1)}%</span>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-400">Portfolio</span>
            <span className="text-sm font-bold text-gray-700">Allocation</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── metric card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string; value: string; sub?: string;
  color?: string; badge?: string; badgeColor?: string;
  accent?: string; icon?: React.ReactNode;
}
function MetricCard({ label, value, sub, color = 'text-gray-800', badge, badgeColor = 'bg-gray-100 text-gray-600', accent, icon }: MetricCardProps) {
  return (
    <div className={`bg-white border rounded-2xl shadow-sm px-5 py-4 ${accent ?? 'border-gray-200'}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className="opacity-60">{icon}</span>}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {badge && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-0.5 ${badgeColor}`}>{badge}</span>}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── currency toggle ──────────────────────────────────────────────────────────

type DisplayCurrency = 'INR' | 'USD';

function CurrencyToggle({ value, onChange }: { value: DisplayCurrency; onChange: (c: DisplayCurrency) => void }) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
      {(['INR', 'USD'] as DisplayCurrency[]).map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            value === c
              ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {c === 'INR' ? '₹ INR' : '$ USD'}
        </button>
      ))}
    </div>
  );
}

// ─── category config ──────────────────────────────────────────────────────────

const CATS = [
  { key: 'us',    label: 'US Equity',             color: '#3b82f6', tabId: 'equity' },
  { key: 'india', label: 'India Equity',           color: '#10b981', tabId: 'india-equity' },
  { key: 'mf',    label: 'Mutual Funds',           color: '#f59e0b', tabId: 'india-mf' },
  { key: 're',    label: 'Real Estate',            color: '#f97316', tabId: 'realestate' },
  { key: 'addl',  label: 'Additional Investments', color: '#06b6d4', tabId: 'additional' },
  { key: 'loans', label: 'Interest Loans',         color: '#8b5cf6', tabId: 'loans' },
  { key: 'cash',  label: 'Cash',                   color: '#14b8a6', tabId: null },
] as const;
type CatKey = typeof CATS[number]['key'];

interface CatData { invested: number; current: number; pnl: number; pnlPct: number; allocation: number; }
interface NAVData { schemeCode: string; currentNAV: number; }

// ─── main component ───────────────────────────────────────────────────────────

export default function ConsolidatedDashboard() {
  const { currentUser } = useAuth();
  const user = currentUser ?? 'default';
  const { holdings, usdCashBalances, inrCashBalances } = usePortfolio();
  const { config } = useAppConfig();
  const { rate: usdToINR, loading: rateLoading, refresh: refreshRate } = useUSDINR();

  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('INR');
  const [mfNavMap, setMfNavMap] = useState<Record<string, number>>({});

  // All cat values are stored in INR; this helper converts for display
  const fmt = (inrAmt: number) => {
    if (displayCurrency === 'USD') {
      const usd = inrAmt / usdToINR;
      return '$' + Math.abs(usd).toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return '₹' + Math.abs(inrAmt).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const currLabel = displayCurrency === 'INR' ? '₹' : '$';

  const visibleCats = CATS.filter(c => c.tabId === null || config.enabledTabs[c.tabId] !== false);
  const noGainCats = new Set<CatKey>(['cash', 'loans']);

  const realEstate = useMemo<RealEstateProperty[]>(() => {
    try { return JSON.parse(localStorage.getItem(`ft_realestate_${user}`) || '[]'); } catch { return []; }
  }, [user]);

  const loans = useMemo<LoanInvestment[]>(() => {
    try { return JSON.parse(localStorage.getItem(`ft_loans_${user}`) || '[]'); } catch { return []; }
  }, [user]);

  const mfHoldings = useMemo<MFHolding[]>(() => {
    try { return JSON.parse(localStorage.getItem(`ft_mf_${user}`) || '[]'); } catch { return []; }
  }, [user]);

  const additionalInvestments = useMemo<AdditionalInvestment[]>(() => {
    try { return JSON.parse(localStorage.getItem(`ft_investments_${user}`) || '[]'); } catch { return []; }
  }, [user]);

  useEffect(() => {
    if (mfHoldings.length === 0) return;
    const codes = mfHoldings.map(h => h.schemeCode).join(',');
    axios.get(`/api/mf/nav?codes=${codes}`)
      .then(r => {
        const map: Record<string, number> = {};
        (r.data?.results ?? []).forEach((n: NAVData) => { map[n.schemeCode] = n.currentNAV; });
        setMfNavMap(map);
      })
      .catch(() => {});
  }, [mfHoldings.length]); // eslint-disable-line

  const cats = useMemo<Record<CatKey, CatData>>(() => {
    const toINR = (amt: number, cur: 'INR' | 'USD') => cur === 'USD' ? amt * usdToINR : amt;

    const usHoldings = holdings.filter(h => h.currency === 'USD');
    const usInvested = usHoldings.reduce((s, h) => s + toINR(h.totalInvested, 'USD'), 0);
    const usCurrent  = usHoldings.reduce((s, h) => s + toINR(h.currentValue ?? h.totalInvested, 'USD'), 0);

    const inHoldings = holdings.filter(h => h.currency === 'INR');
    const inInvested = inHoldings.reduce((s, h) => s + h.totalInvested, 0);
    const inCurrent  = inHoldings.reduce((s, h) => s + (h.currentValue ?? h.totalInvested), 0);

    let mfInvested = 0, mfCurrent = 0;
    mfHoldings.forEach(h => {
      const invested = h.transactions.filter(t => t.type === 'buy').reduce((s, t) => s + t.amount, 0);
      const units    = h.transactions.reduce((s, t) => t.type === 'buy' ? s + t.units : s - t.units, 0);
      const nav      = mfNavMap[h.schemeCode];
      mfInvested += invested;
      mfCurrent  += nav != null ? units * nav : invested;
    });

    const activeRE   = realEstate.filter(p => p.status === 'active');
    const reInvested = activeRE.reduce((s, p) => s + toINR(p.propertyPrice * (p.mySharePercent / 100), p.currency), 0);
    const reCurrent  = activeRE.reduce((s, p) => s + toINR(reEstimate(p), p.currency), 0);

    const addlInvested = additionalInvestments.reduce((s, i) => s + toINR(i.amountInvested, i.currency), 0);
    const addlCurrent  = additionalInvestments.reduce((s, i) => s + toINR(addlEstimate(i), i.currency), 0);

    const loanInvested    = loans.reduce((s, l) => s + toINR(l.principal, l.currency), 0);
    const loanOutstanding = loans.reduce((s, l) => {
      const returned = l.returns.reduce((x, r) => x + r.amount, 0);
      return s + toINR(Math.max(0, l.principal - returned), l.currency);
    }, 0);

    const cashINR   = Object.values(inrCashBalances).reduce((s, v) => s + (v ?? 0), 0);
    const cashUSD   = Object.values(usdCashBalances).reduce((s, v) => s + (v ?? 0), 0);
    const cashTotal = cashINR + cashUSD * usdToINR;

    const totalCurrent = usCurrent + inCurrent + mfCurrent + reCurrent + addlCurrent + loanOutstanding + cashTotal;

    const make = (invested: number, current: number): CatData => {
      const pnl    = current - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const allocation = totalCurrent > 0 ? (current / totalCurrent) * 100 : 0;
      return { invested, current, pnl, pnlPct, allocation };
    };

    return {
      us:    make(usInvested,   usCurrent),
      india: make(inInvested,   inCurrent),
      mf:    make(mfInvested,   mfCurrent),
      re:    make(reInvested,   reCurrent),
      addl:  make(addlInvested, addlCurrent),
      loans: make(loanInvested, loanOutstanding),
      cash:  make(cashTotal,    cashTotal),
    };
  }, [holdings, realEstate, loans, mfHoldings, additionalInvestments, usdCashBalances, inrCashBalances, usdToINR, mfNavMap]);

  // ── Summary values (all in INR internally) ──────────────────────────────────
  const totalInvested = cats.us.invested + cats.india.invested + cats.mf.invested + cats.re.invested + cats.addl.invested;
  const totalCurrent  = Object.values(cats).reduce((s, c) => s + c.current, 0);
  const equityGain    = (cats.us.current - cats.us.invested) + (cats.india.current - cats.india.invested);
  const mfGain        = cats.mf.current - cats.mf.invested;
  const reGain        = cats.re.current - cats.re.invested;
  const addlGain      = cats.addl.current - cats.addl.invested;
  const netPnL        = equityGain + mfGain + reGain + addlGain;
  const netPnLPct     = totalInvested > 0 ? (netPnL / totalInvested) * 100 : 0;

  // Liquidable: US Equity + India Equity + Mutual Funds + All Cash (INR)
  const liquidableINR    = cats.us.current + cats.india.current + cats.mf.current + cats.cash.current;
  // Not Liquidable: Interest Investments + Real Estate + Additional Investments (INR)
  const notLiquidableINR = cats.loans.current + cats.re.current + cats.addl.current;

  const donutSegments = visibleCats
    .map(c => ({ label: c.label, pct: cats[c.key].allocation, color: c.color }))
    .filter(s => s.pct > 0.1);

  const pnlBadgeColor = (v: number) => v >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';

  const catSubtitle = (key: CatKey): string => {
    switch (key) {
      case 'us':    return `${holdings.filter(h => h.currency === 'USD').length} holdings`;
      case 'india': return `${holdings.filter(h => h.currency === 'INR').length} holdings`;
      case 'mf':    return `${mfHoldings.length} fund${mfHoldings.length !== 1 ? 's' : ''}`;
      case 're':    return `${realEstate.filter(p => p.status === 'active').length} active properties`;
      case 'addl':  return `${additionalInvestments.length} investment${additionalInvestments.length !== 1 ? 's' : ''}`;
      case 'loans': return `${loans.length} loan${loans.length !== 1 ? 's' : ''}`;
      case 'cash':  return 'USD + INR balances';
    }
  };

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Portfolio Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            All values in {displayCurrency} equivalent
            {displayCurrency === 'USD' && !rateLoading && (
              <span className="ml-1 text-blue-500">(1 USD = ₹{usdToINR.toFixed(2)})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Currency toggle */}
          <CurrencyToggle value={displayCurrency} onChange={setDisplayCurrency} />

          {/* Export */}
          <button
            onClick={() => {
              const rows: Record<string, unknown>[] = visibleCats.map(c => ({
                'Asset Class': c.label,
                [`Invested (${currLabel})`]: +(displayCurrency === 'USD' ? cats[c.key].invested / usdToINR : cats[c.key].invested).toFixed(0),
                [`Current Value (${currLabel})`]: +(displayCurrency === 'USD' ? cats[c.key].current / usdToINR : cats[c.key].current).toFixed(0),
                [`Gain / Loss (${currLabel})`]: +(displayCurrency === 'USD' ? cats[c.key].pnl / usdToINR : cats[c.key].pnl).toFixed(0),
                'Gain %': +cats[c.key].pnlPct.toFixed(2),
                'Allocation %': +cats[c.key].allocation.toFixed(2),
              }));
              downloadExcel(rows, 'portfolio-dashboard', 'Dashboard');
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
          >
            <Download className="w-3 h-3" /> Export
          </button>

          {/* FX rate badge */}
          <button
            onClick={refreshRate}
            disabled={rateLoading}
            title="Refresh USD/INR rate"
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:cursor-not-allowed ${rateLoading ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100 hover:border-blue-200'}`}
          >
            <RefreshCw className={`w-3 h-3 ${rateLoading ? 'animate-spin' : ''}`} />
            {rateLoading ? 'Fetching rate…' : `1 USD = ₹${usdToINR.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* ── Liquidity stickers ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl shadow-sm px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">Liquidable Assets</p>
          </div>
          <p className="text-3xl font-bold text-emerald-700">{fmt(liquidableINR)}</p>
          <p className="text-xs text-emerald-600 mt-1.5">
            US Equity · India Equity · Mutual Funds · Cash
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-700">
            <span>US Equity: <strong>{fmt(cats.us.current)}</strong></span>
            <span>India Equity: <strong>{fmt(cats.india.current)}</strong></span>
            <span>Mutual Funds: <strong>{fmt(cats.mf.current)}</strong></span>
            <span>Cash: <strong>{fmt(cats.cash.current)}</strong></span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl shadow-sm px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-orange-600" />
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-widest">Not Liquidable Assets</p>
          </div>
          <p className="text-3xl font-bold text-orange-700">{fmt(notLiquidableINR)}</p>
          <p className="text-xs text-orange-600 mt-1.5">
            Real Estate · Interest Investments · Additional
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-orange-700">
            <span>Real Estate: <strong>{fmt(cats.re.current)}</strong></span>
            <span>Interest Inv.: <strong>{fmt(cats.loans.current)}</strong></span>
            <span>Additional: <strong>{fmt(cats.addl.current)}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Portfolio"
          value={fmt(totalCurrent)}
          sub={`All assets, ${displayCurrency} equivalent`}
        />
        <MetricCard
          label="Total Invested"
          value={fmt(totalInvested)}
          sub="Equity + MF + RE + Addl."
        />
        <MetricCard
          label="Equity Gain"
          value={fmt(equityGain)}
          color={equityGain >= 0 ? 'text-emerald-600' : 'text-red-600'}
          badge={`${equityGain >= 0 ? '+' : ''}${(cats.us.invested + cats.india.invested) > 0 ? (equityGain / (cats.us.invested + cats.india.invested) * 100).toFixed(1) : '0'}%`}
          badgeColor={pnlBadgeColor(equityGain)}
          sub="US + India equity"
        />
        <MetricCard
          label="MF + Addl. Gain"
          value={fmt(mfGain + addlGain)}
          color={(mfGain + addlGain) >= 0 ? 'text-emerald-600' : 'text-red-600'}
          badge={`${(mfGain + addlGain) >= 0 ? '+' : ''}${(cats.mf.invested + cats.addl.invested) > 0 ? ((mfGain + addlGain) / (cats.mf.invested + cats.addl.invested) * 100).toFixed(1) : '0'}%`}
          badgeColor={pnlBadgeColor(mfGain + addlGain)}
          sub="Mutual Funds + Additional"
        />
        <MetricCard
          label="Net P&L"
          value={fmt(netPnL)}
          color={netPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}
          badge={`${netPnL >= 0 ? '+' : ''}${netPnLPct.toFixed(1)}%`}
          badgeColor={pnlBadgeColor(netPnL)}
          sub="All invested assets"
        />
      </div>

      {/* ── Donut + Category table ── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Donut chart */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4 lg:w-72 shrink-0">
          <p className="text-sm font-semibold text-gray-700 self-start">Allocation</p>
          {donutSegments.length > 0 ? (
            <>
              <DonutChart segments={donutSegments} />
              <div className="w-full space-y-2">
                {visibleCats.map(c => {
                  const data = cats[c.key];
                  if (data.allocation < 0.1) return null;
                  return (
                    <div key={c.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                        <span className="text-gray-600 font-medium">{c.label}</span>
                      </div>
                      <span className="font-semibold text-gray-700">{data.allocation.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Breakdown table */}
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Invested ({currLabel})</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Value ({currLabel})</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Gain / Loss ({currLabel})</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Gain %</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleCats.map(c => {
                  const d = cats[c.key];
                  const hideGain = noGainCats.has(c.key);
                  return (
                    <tr key={c.key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                          <span className="font-semibold text-gray-800">{c.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 ml-5 mt-0.5">{catSubtitle(c.key)}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {hideGain ? <span className="text-gray-400">—</span> : fmt(d.invested)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(d.current)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${hideGain ? 'text-gray-400' : d.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {hideGain ? '—' : `${d.pnl >= 0 ? '+' : ''}${fmt(d.pnl)}`}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${hideGain ? 'text-gray-400' : d.pnlPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {hideGain ? '—' : `${d.pnlPct >= 0 ? '+' : ''}${d.pnlPct.toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(d.allocation, 100)}%`, background: c.color }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-10 text-right">
                            {d.allocation.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td className="px-4 py-3 text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt(totalInvested)}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{fmt(totalCurrent)}</td>
                  <td className={`px-4 py-3 text-right ${netPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {netPnL >= 0 ? '+' : ''}{fmt(netPnL)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm ${netPnLPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {netPnLPct >= 0 ? '+' : ''}{netPnLPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500 pr-6">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── Sub-metrics row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {config.enabledTabs['india-mf'] !== false && (
          <MetricCard
            label="Mutual Funds"
            value={fmt(cats.mf.current)}
            sub={`${mfHoldings.length} fund${mfHoldings.length !== 1 ? 's' : ''} · gain ${mfGain >= 0 ? '+' : ''}${fmt(mfGain)}`}
            color="text-amber-600"
            badge={cats.mf.invested > 0 ? `${cats.mf.pnlPct >= 0 ? '+' : ''}${cats.mf.pnlPct.toFixed(1)}%` : undefined}
            badgeColor={pnlBadgeColor(mfGain)}
          />
        )}
        {config.enabledTabs['additional'] !== false && (
          <MetricCard
            label="Additional Investments"
            value={fmt(cats.addl.current)}
            sub={`${additionalInvestments.length} investment${additionalInvestments.length !== 1 ? 's' : ''} · gain ${addlGain >= 0 ? '+' : ''}${fmt(addlGain)}`}
            color="text-cyan-700"
            badge={cats.addl.invested > 0 ? `${cats.addl.pnlPct >= 0 ? '+' : ''}${cats.addl.pnlPct.toFixed(1)}%` : undefined}
            badgeColor={pnlBadgeColor(addlGain)}
          />
        )}
        {config.enabledTabs['loans'] !== false && (
          <MetricCard
            label="Loans Outstanding"
            value={fmt(cats.loans.current)}
            sub={`${loans.length} loan${loans.length !== 1 ? 's' : ''} · money owed to you`}
            color="text-purple-700"
          />
        )}
        <MetricCard
          label="Cash (INR + USD)"
          value={fmt(cats.cash.current)}
          sub={`₹${Object.values(inrCashBalances).reduce((s, v) => s + (v ?? 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} + $${Object.values(usdCashBalances).reduce((s, v) => s + (v ?? 0), 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          color="text-teal-700"
        />
      </div>
    </div>
  );
}
