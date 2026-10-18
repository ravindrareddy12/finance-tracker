import React from 'react';
import {
  BarChart3, Building2, Flame, HandCoins, LayoutDashboard, Receipt, TrendingUp, ArrowUpRight, RefreshCw,
} from 'lucide-react';

// Illustrative sample data for the marketing mockups — not real user data.

const NET_WORTH_SERIES = [38.2, 39.0, 38.6, 40.4, 41.9, 41.2, 43.8, 45.1, 47.6, 49.3, 51.8, 54.2];
const MONTHS = ['Nov', 'Jan', 'Mar', 'May', 'Jul', 'Sep'];

const ALLOCATION = [
  { label: 'Indian equity', pct: 34, color: '#3b82f6' },
  { label: 'Mutual funds', pct: 26, color: '#6366f1' },
  { label: 'Real estate', pct: 22, color: '#10b981' },
  { label: 'US equity', pct: 12, color: '#0ea5e9' },
  { label: 'Other', pct: 6, color: '#f59e0b' },
];

const HOLDINGS = [
  { sym: 'RELIANCE', name: 'NSE · 120 shares', value: '₹3.52L', ret: '+18.4%' },
  { sym: 'PPFAS Flexi Cap', name: 'Mutual fund · SIP', value: '₹6.84L', ret: '+21.7%' },
  { sym: 'AAPL', name: 'NASDAQ · 18 shares', value: '₹3.41L', ret: '+12.9%' },
  { sym: 'Plot · Hyderabad', name: 'Real estate · 50% share', value: '₹12.0L', ret: '+9.2%' },
];

function areaPath(values: number[], w: number, h: number) {
  const min = Math.min(...values) * 0.96;
  const max = Math.max(...values) * 1.02;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / (max - min)) * h]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return { line, area: `${line} L${w} ${h} L0 ${h} Z`, last: pts[pts.length - 1] };
}

function NetWorthChart() {
  const W = 400, H = 120;
  const { line, area, last } = areaPath(NET_WORTH_SERIES, W, H);
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="nw-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#e2e8f0" strokeDasharray="3 4" />)}
      <path d={area} fill="url(#nw-fill)" />
      <path d={line} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0] - 1.5} cy={last[1]} r="4.5" fill="#fff" stroke="#2563eb" strokeWidth="2.5" />
      {MONTHS.map((m, i) => (
        <text key={m} x={(i / (MONTHS.length - 1)) * (W - 24) + 4} y={H + 15} fontSize="10" fill="#94a3b8">{m}</text>
      ))}
    </svg>
  );
}

export function Donut({ size = 'w-28 h-28', track = '#f1f5f9' }: { size?: string; track?: string }) {
  let offset = 25; // start at 12 o'clock
  return (
    <svg viewBox="0 0 42 42" className={size} aria-hidden="true">
      <circle cx="21" cy="21" r="15.915" fill="none" stroke={track} strokeWidth="6" />
      {ALLOCATION.map(a => {
        const el = (
          <circle key={a.label} cx="21" cy="21" r="15.915" fill="none" stroke={a.color} strokeWidth="6"
            strokeDasharray={`${a.pct - 0.8} ${100 - a.pct + 0.8}`} strokeDashoffset={offset} />
        );
        offset -= a.pct;
        return el;
      })}
    </svg>
  );
}

const SIDEBAR = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: TrendingUp, label: 'US Equity' },
  { icon: TrendingUp, label: 'India Equity' },
  { icon: BarChart3, label: 'Mutual Funds' },
  { icon: HandCoins, label: 'Interest' },
  { icon: Building2, label: 'Real Estate' },
  { icon: Flame, label: 'FIRE' },
  { icon: Receipt, label: 'Expenses' },
];

function Stat({ label, value, sub, positive }: { label: string; value: string; sub: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-base sm:text-xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className={`mt-0.5 text-[10px] sm:text-xs font-medium ${positive ? 'text-emerald-600' : 'text-slate-500'}`}>{sub}</p>
    </div>
  );
}

/** Browser-window mockup of the dashboard */
export function AppWindowMockup() {
  return (
    <div className="rounded-2xl bg-white/95 shadow-2xl shadow-blue-950/40 ring-1 ring-slate-900/10 overflow-hidden text-left select-none"
      role="img" aria-label="Preview of the Finance Tracker dashboard with sample data">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 h-10 bg-slate-100 border-b border-slate-200">
        <span className="w-3 h-3 rounded-full bg-red-400" />
        <span className="w-3 h-3 rounded-full bg-amber-400" />
        <span className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-3 flex-1 max-w-xs mx-auto h-6 rounded-md bg-white text-[11px] text-slate-400 flex items-center justify-center">
          finance.mypgmanager.com/dashboard
        </span>
      </div>
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-44 shrink-0 border-r border-slate-200 bg-slate-50/80 p-3 space-y-0.5">
          {SIDEBAR.map(({ icon: Icon, label, active }) => (
            <div key={label} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </div>
          ))}
        </aside>
        {/* Main */}
        <div className="flex-1 min-w-0 p-3 sm:p-5 bg-slate-50/40 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base font-bold text-slate-900">Overview</p>
              <p className="text-[10px] sm:text-xs text-slate-500">All accounts · INR</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1">
              <RefreshCw className="w-3 h-3" /> Live prices
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Net worth" value="₹54.2L" sub="▲ 4.6% this month" positive />
            <Stat label="Invested" value="₹41.8L" sub="Across 6 asset classes" />
            <Stat label="XIRR" value="14.8%" sub="▲ Annualised" positive />
          </div>
          <div className="grid sm:grid-cols-5 gap-2 sm:gap-3">
            <div className="sm:col-span-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-700">Net worth · 12 months</p>
                <p className="text-[11px] font-semibold text-emerald-600">+₹16.0L</p>
              </div>
              <NetWorthChart />
            </div>
            <div className="hidden sm:flex sm:col-span-2 rounded-xl border border-slate-200 bg-white p-4 flex-col">
              <p className="text-xs font-semibold text-slate-700">Allocation</p>
              <div className="flex items-center gap-3 mt-3">
                <Donut size="w-20 h-20 shrink-0" />
                <ul className="space-y-1 text-[10px] text-slate-600 min-w-0">
                  {ALLOCATION.map(a => (
                    <li key={a.label} className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />{a.label}
                      <span className="ml-auto pl-1 font-semibold text-slate-800 tabular-nums">{a.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-3 sm:px-4 py-2.5 border-b border-slate-100 flex justify-between text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span>Top holdings</span><span>Value · Return</span>
            </div>
            {HOLDINGS.map(h => (
              <div key={h.sym} className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between border-b last:border-0 border-slate-100">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{h.sym}</p>
                  <p className="text-[10px] text-slate-500 truncate">{h.name}</p>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <p className="text-xs font-semibold text-slate-800 tabular-nums">{h.value}</p>
                  <p className="text-[10px] font-semibold text-emerald-600 tabular-nums">{h.ret}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Android phone mockup of the app */
export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[260px] rounded-[2.6rem] bg-slate-900 p-2.5 shadow-2xl shadow-blue-950/40 ring-1 ring-white/10"
      role="img" aria-label="Preview of the Finance Tracker Android app with sample data">
      <div className="rounded-[2.1rem] bg-slate-50 overflow-hidden text-left">
        <div className="flex justify-between items-center px-6 pt-3 pb-1 text-[10px] font-semibold text-slate-700">
          <span>9:41</span><span className="w-16 h-4 rounded-full bg-slate-900" /><span>5G</span>
        </div>
        <div className="px-4 pt-3 pb-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white mx-3 mt-2 rounded-2xl">
          <p className="text-[10px] uppercase tracking-wide text-blue-100">Net worth</p>
          <p className="text-2xl font-bold mt-0.5">₹54.2L</p>
          <p className="text-[10px] text-emerald-200 font-semibold mt-0.5">▲ ₹2.4L this month</p>
        </div>
        <div className="px-3 py-3 space-y-2">
          {[
            { icon: TrendingUp, label: 'Equity', v: '₹24.9L', tone: 'bg-blue-100 text-blue-600' },
            { icon: BarChart3, label: 'Mutual funds', v: '₹14.1L', tone: 'bg-indigo-100 text-indigo-600' },
            { icon: Building2, label: 'Real estate', v: '₹12.0L', tone: 'bg-emerald-100 text-emerald-600' },
            { icon: HandCoins, label: 'Interest', v: '₹3.2L', tone: 'bg-amber-100 text-amber-600' },
          ].map(({ icon: Icon, label, v, tone }) => (
            <div key={label} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-slate-200">
              <span className={`p-1.5 rounded-lg ${tone}`}><Icon className="w-3.5 h-3.5" /></span>
              <span className="text-xs font-medium text-slate-700">{label}</span>
              <span className="ml-auto text-xs font-bold text-slate-900">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-around border-t border-slate-200 bg-white py-2.5 text-slate-400">
          <LayoutDashboard className="w-4 h-4 text-blue-600" /><TrendingUp className="w-4 h-4" />
          <BarChart3 className="w-4 h-4" /><Receipt className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

/** Mutual fund SIP card with XIRR, for the returns spotlight */
export function SipCard() {
  const rows = [
    { d: '05 Sep 2026', nav: '₹84.12', u: '118.879' },
    { d: '05 Aug 2026', nav: '₹82.57', u: '121.110' },
    { d: '05 Jul 2026', nav: '₹80.93', u: '123.564' },
  ];
  return (
    <div className="rounded-2xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 p-5 sm:p-6" role="img"
      aria-label="Sample mutual fund SIP with XIRR return">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">Parag Parikh Flexi Cap</p>
          <p className="text-xs text-slate-500 mt-0.5">SIP ₹10,000 · 5th of every month</p>
        </div>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100 px-2.5 py-1 rounded-full whitespace-nowrap">XIRR 16.2%</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-5 text-center">
        {[['Invested', '₹4.8L'], ['Current', '₹6.84L'], ['Gain', '+₹2.04L']].map(([k, v], i) => (
          <div key={k} className="rounded-xl bg-slate-50 py-2.5">
            <p className="text-[11px] text-slate-500">{k}</p>
            <p className={`text-sm font-bold mt-0.5 ${i === 2 ? 'text-emerald-600' : 'text-slate-900'}`}>{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Auto-recorded instalments</p>
      <ul className="mt-2 divide-y divide-slate-100 text-xs">
        {rows.map(r => (
          <li key={r.d} className="flex justify-between py-2 text-slate-600 tabular-nums">
            <span>{r.d}</span><span>NAV {r.nav}</span><span className="font-semibold text-slate-800">{r.u} units</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** US + India combined view, for the cross-border spotlight */
export function CurrencyCard() {
  return (
    <div className="rounded-2xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 p-5 sm:p-6 space-y-3" role="img"
      aria-label="Sample US and Indian holdings combined into one net worth">
      {[
        { flag: '🇺🇸', title: 'US equity', sub: 'NYSE · NASDAQ', v: '$7,820', conv: '≈ ₹6.5L' },
        { flag: '🇮🇳', title: 'India equity', sub: 'NSE', v: '₹18.4L', conv: '' },
        { flag: '📈', title: 'Mutual funds', sub: '7 funds · 4 SIPs', v: '₹14.1L', conv: '' },
      ].map(r => (
        <div key={r.title} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
          <span className="text-xl" aria-hidden="true">{r.flag}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{r.title}</p>
            <p className="text-xs text-slate-500">{r.sub}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-bold text-slate-900 tabular-nums">{r.v}</p>
            {r.conv && <p className="text-[11px] text-slate-500 tabular-nums">{r.conv}</p>}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3.5">
        <span className="text-sm font-medium">Combined in INR</span>
        <span className="flex items-center gap-1 text-lg font-bold tabular-nums">₹39.0L <ArrowUpRight className="w-4 h-4" /></span>
      </div>
    </div>
  );
}

/** FIRE progress ring, for the planning spotlight */
export function FireCard() {
  const pct = 36;
  return (
    <div className="rounded-2xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 p-5 sm:p-6" role="img"
      aria-label="Sample FIRE progress of 36 percent">
      <div className="flex items-center gap-5">
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle cx="21" cy="21" r="15.915" fill="none" stroke="#ffedd5" strokeWidth="4.5" />
            <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f97316" strokeWidth="4.5" strokeLinecap="round"
              strokeDasharray={`${pct} ${100 - pct}`} />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{pct}%</span>
            <span className="text-[10px] text-slate-500">to FIRE</span>
          </span>
        </div>
        <dl className="grid gap-2.5 text-sm flex-1">
          {[['Target corpus', '₹1.5 Cr'], ['Portfolio today', '₹54.2L'], ['Withdrawal rate', '3.5%'], ['Inflation', '6%']].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-900 tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
