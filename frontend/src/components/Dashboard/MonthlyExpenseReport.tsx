import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MonthlyObligation, ObligationType } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const OBLIGATION_TYPES: ObligationType[] = [
  'Credit Card', 'Housing Loan', 'Personal Loan', 'Rent', 'Others',
];

const TYPE_COLORS: Record<ObligationType, string> = {
  'Credit Card':   '#8b5cf6',
  'Housing Loan':  '#3b82f6',
  'Personal Loan': '#f97316',
  'Rent':          '#22c55e',
  'Others':        '#94a3b8',
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth(); // 0-indexed

// ─── Storage ──────────────────────────────────────────────────────────────────

function storageKey(user: string) { return `ft_monthly_expenses_${user}`; }

function loadAll(user: string): Record<string, MonthlyObligation[]> {
  try { return JSON.parse(localStorage.getItem(storageKey(user)) || '{}'); }
  catch { return {}; }
}

function toKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

const fmt = (n: number) =>
  n >= 1_00_000
    ? '₹' + (n / 1_00_000).toFixed(1) + 'L'
    : n >= 1000
    ? '₹' + (n / 1000).toFixed(1) + 'K'
    : '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtFull = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ─── Donut Chart ──────────────────────────────────────────────────────────────

const R = 72, STROKE = 28, CX = 96, CY = 96, CIRC = 2 * Math.PI * R;

interface DonutSeg { label: string; value: number; color: string; pct: number; }

function DonutChart({ segments }: { segments: DonutSeg[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  let cumulative = 0;
  const arcs = segments.map(s => {
    const rotation = (cumulative / 100) * 360 - 90;
    const dash = (s.pct / 100) * CIRC;
    cumulative += s.pct;
    return { ...s, rotation, dash };
  });

  const active = hovered ? segments.find(s => s.label === hovered) : null;

  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: 192, height: 192 }}>
        <span className="text-gray-400 text-sm">No data</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: 192, height: 192 }}>
      <svg width={192} height={192} viewBox="0 0 192 192">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
        {arcs.map(arc => (
          <circle key={arc.label} cx={CX} cy={CY} r={R}
            fill="none" stroke={arc.color}
            strokeWidth={hovered === arc.label ? STROKE + 5 : STROKE}
            strokeDasharray={`${arc.dash} ${CIRC - arc.dash}`}
            strokeDashoffset={0}
            transform={`rotate(${arc.rotation} ${CX} ${CY})`}
            style={{ transition: 'stroke-width 0.15s', cursor: 'pointer' }}
            onMouseEnter={() => setHovered(arc.label)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {active ? (
          <>
            <span className="text-[10px] font-semibold text-gray-500 leading-tight px-1">{active.label}</span>
            <span className="text-base font-bold mt-0.5" style={{ color: active.color }}>{active.pct.toFixed(1)}%</span>
            <span className="text-[10px] text-gray-500">{fmtFull(active.value)}</span>
          </>
        ) : (
          <>
            <span className="text-[10px] text-gray-400">Allocation</span>
            <span className="text-base font-bold text-gray-700">{segments.length} types</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

interface BarData { month: number; paid: number; unpaid: number; total: number; isActive: boolean; }

function BarChart({ data, maxVal, selectedMonth }: { data: BarData[]; maxVal: number; selectedMonth: number | null }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const W = 580, H = 260;
  const ML = 64, MB = 36, MT = 16, MR = 12;
  const PW = W - ML - MR, PH = H - MT - MB;

  const slotW = PW / 12;
  const barW = Math.max(18, slotW - 14);
  const y = (v: number) => maxVal > 0 ? PH - (v / maxVal) * PH : PH;
  const bh = (v: number) => maxVal > 0 ? (v / maxVal) * PH : 0;

  // Y-axis grid lines (5 steps)
  const ticks = Array.from({ length: 6 }, (_, i) => Math.round((maxVal / 5) * i));

  const tooltip = hovered !== null ? data[hovered] : null;

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Grid lines */}
        {ticks.map((tick, i) => (
          <g key={i}>
            <line x1={ML} y1={MT + y(tick)} x2={ML + PW} y2={MT + y(tick)}
              stroke="#f1f5f9" strokeWidth={1} />
            <text x={ML - 6} y={MT + y(tick) + 4} textAnchor="end"
              fontSize={9} fill="#94a3b8">{fmt(tick)}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="#e2e8f0" strokeWidth={1} />
        <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="#e2e8f0" strokeWidth={1} />

        {/* Bars */}
        {data.map((d, i) => {
          const x = ML + i * slotW + (slotW - barW) / 2;
          const isHov = hovered === i;
          const isActive = selectedMonth !== null && d.month === selectedMonth;

          return (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}>

              {/* Hover highlight */}
              {isHov && (
                <rect x={ML + i * slotW} y={MT} width={slotW} height={PH}
                  fill="#f8fafc" rx={2} />
              )}

              {/* Unpaid (top, red) */}
              {d.unpaid > 0 && (
                <rect x={x} y={MT + y(d.total)} width={barW} height={bh(d.unpaid)}
                  fill={isHov ? '#f87171' : '#fca5a5'} rx={2}
                  style={{ transition: 'fill 0.15s' }} />
              )}

              {/* Paid (bottom, green) */}
              {d.paid > 0 && (
                <rect x={x} y={MT + y(d.paid)} width={barW} height={bh(d.paid)}
                  fill={isHov ? '#4ade80' : '#86efac'} rx={2}
                  style={{ transition: 'fill 0.15s' }} />
              )}

              {/* Active month outline */}
              {isActive && d.total > 0 && (
                <rect x={x - 2} y={MT + y(d.total) - 2}
                  width={barW + 4} height={bh(d.total) + 4}
                  fill="none" stroke="#3b82f6" strokeWidth={2} rx={3} />
              )}

              {/* X-axis label */}
              <text x={ML + i * slotW + slotW / 2} y={MT + PH + 18}
                textAnchor="middle" fontSize={10}
                fill={isActive ? '#3b82f6' : '#94a3b8'}
                fontWeight={isActive ? 'bold' : 'normal'}>
                {MONTH_LABELS[d.month]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute top-2 right-2 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs pointer-events-none">
          <p className="font-semibold text-gray-700 mb-1">{MONTH_LABELS[tooltip.month]}</p>
          <p className="text-green-600">Paid: {fmtFull(tooltip.paid)}</p>
          <p className="text-red-500">Unpaid: {fmtFull(tooltip.unpaid)}</p>
          <p className="text-gray-700 font-semibold border-t border-gray-100 mt-1 pt-1">Total: {fmtFull(tooltip.total)}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MonthlyExpenseReport() {
  const { currentUser } = useAuth();
  const user = currentUser ?? 'default';

  const [selYear, setSelYear]   = useState(CURRENT_YEAR);
  const [selMonth, setSelMonth] = useState<number | 'all'>(CURRENT_MONTH);

  const allData = useMemo(() => loadAll(user), [user]);

  // Available years from stored data + current year
  const availableYears = useMemo(() => {
    const years = new Set<number>([CURRENT_YEAR]);
    Object.keys(allData).forEach(k => {
      const y = parseInt(k.split('-')[0]);
      if (!isNaN(y)) years.add(y);
    });
    return [...years].sort((a, b) => b - a);
  }, [allData]);

  // Obligations for selected period
  const obligations = useMemo(() => {
    if (selMonth === 'all') {
      const result: MonthlyObligation[] = [];
      for (let m = 0; m < 12; m++) {
        result.push(...(allData[toKey(selYear, m)] ?? []));
      }
      return result;
    }
    return allData[toKey(selYear, selMonth)] ?? [];
  }, [allData, selYear, selMonth]);

  // Summary stats
  const totalAmount  = obligations.reduce((s, o) => s + o.amount, 0);
  const totalPaid    = obligations.filter(o => o.status === 'Paid').reduce((s, o) => s + o.amount, 0);
  const totalUnpaid  = totalAmount - totalPaid;
  const paidCount    = obligations.filter(o => o.status === 'Paid').length;
  const completionPct = obligations.length > 0 ? Math.round((paidCount / obligations.length) * 100) : 0;

  // Donut segments by obligation type
  const donutSegments: DonutSeg[] = useMemo(() => {
    return OBLIGATION_TYPES
      .map(type => {
        const value = obligations.filter(o => o.type === type).reduce((s, o) => s + o.amount, 0);
        return { label: type, value, color: TYPE_COLORS[type], pct: totalAmount > 0 ? (value / totalAmount) * 100 : 0 };
      })
      .filter(s => s.value > 0);
  }, [obligations, totalAmount]);

  // Bar chart data — all 12 months of selected year
  const barData: BarData[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const obs = allData[toKey(selYear, m)] ?? [];
      const paid   = obs.filter(o => o.status === 'Paid').reduce((s, o) => s + o.amount, 0);
      const unpaid = obs.filter(o => o.status === 'Unpaid').reduce((s, o) => s + o.amount, 0);
      return { month: m, paid, unpaid, total: paid + unpaid, isActive: selMonth !== 'all' && m === selMonth };
    });
  }, [allData, selYear, selMonth]);

  const barMax = Math.max(...barData.map(d => d.total), 1);

  // Per-type breakdown for selected period
  const typeBreakdown = useMemo(() => {
    return OBLIGATION_TYPES.map(type => {
      const items = obligations.filter(o => o.type === type);
      const total  = items.reduce((s, o) => s + o.amount, 0);
      const paid   = items.filter(o => o.status === 'Paid').reduce((s, o) => s + o.amount, 0);
      return { type, total, paid, unpaid: total - paid, count: items.length };
    }).filter(r => r.count > 0);
  }, [obligations]);

  const periodLabel = selMonth === 'all'
    ? `Full Year ${selYear}`
    : new Date(selYear, selMonth as number, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">

      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Expense Report</h2>
          <p className="text-sm text-gray-400 mt-0.5">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Year */}
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Month */}
          <select value={selMonth === 'all' ? 'all' : String(selMonth)}
            onChange={e => setSelMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700">
            <option value="all">All Months</option>
            {MONTH_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="TOTAL OBLIGATIONS" value={fmtFull(totalAmount)} sub={`${obligations.length} items`} valueClass="text-gray-900" border="border-gray-200" />
        <StatCard label="TOTAL PAID" value={fmtFull(totalPaid)} sub={`${paidCount} paid`} valueClass="text-green-700" border="border-green-200" />
        <StatCard label="TOTAL UNPAID" value={fmtFull(totalUnpaid)} sub={`${obligations.length - paidCount} pending`} valueClass="text-red-600" border="border-red-200" />
        <StatCard
          label="COMPLETION"
          value={obligations.length > 0 ? `${completionPct}%` : '—'}
          sub={`${paidCount} of ${obligations.length} paid`}
          valueClass={completionPct === 100 ? 'text-green-700' : completionPct >= 50 ? 'text-orange-600' : 'text-red-600'}
          border={completionPct === 100 ? 'border-green-200' : 'border-orange-200'}
        />
      </div>

      {obligations.length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
          <p className="font-medium">No expense data for {periodLabel}</p>
          <p className="text-sm mt-1">Add obligations in the Monthly Expenses tab first.</p>
        </div>
      )}

      {obligations.length > 0 && (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Donut — allocation by type */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-700 mb-1">Allocation by Type</p>
              <p className="text-xs text-gray-400 mb-4">{periodLabel}</p>
              <div className="flex flex-col items-center gap-4">
                <DonutChart segments={donutSegments} />
                {/* Legend */}
                <div className="w-full space-y-2">
                  {donutSegments.map(s => (
                    <div key={s.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-gray-600">{s.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-700">{s.pct.toFixed(1)}%</span>
                        <span className="text-gray-400 ml-2">{fmtFull(s.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bar chart — monthly trend */}
            <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-700">Monthly Trend — {selYear}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm inline-block bg-green-300" /> Paid
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm inline-block bg-red-300" /> Unpaid
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">Hover a bar for details · Blue outline = selected month</p>
              <BarChart
                data={barData}
                maxVal={barMax}
                selectedMonth={selMonth === 'all' ? null : selMonth}
              />
            </div>
          </div>

          {/* Type breakdown table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Breakdown by Type</p>
              <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Unpaid</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {typeBreakdown.map(r => (
                    <tr key={r.type} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: TYPE_COLORS[r.type] }} />
                          <span className="font-medium text-gray-700">{r.type}</span>
                          <span className="text-xs text-gray-400">({r.count})</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">{fmtFull(r.total)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-green-700">{fmtFull(r.paid)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-red-500">{fmtFull(r.unpaid)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="h-2 rounded-full transition-all duration-500"
                              style={{ width: `${totalAmount > 0 ? (r.total / totalAmount) * 100 : 0}%`, background: TYPE_COLORS[r.type] }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 w-10 text-right">
                            {totalAmount > 0 ? ((r.total / totalAmount) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    <td className="px-5 py-3 text-gray-700">Total</td>
                    <td className="px-5 py-3 text-right text-gray-900">{fmtFull(totalAmount)}</td>
                    <td className="px-5 py-3 text-right text-green-700">{fmtFull(totalPaid)}</td>
                    <td className="px-5 py-3 text-right text-red-500">{fmtFull(totalUnpaid)}</td>
                    <td className="px-5 py-3 text-right text-xs text-gray-500">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, valueClass, border }: {
  label: string; value: string; sub: string; valueClass: string; border: string;
}) {
  return (
    <div className={`bg-white border ${border} rounded-xl p-4 shadow-sm`}>
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">{label}</p>
      <p className={`text-lg font-bold leading-tight ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
