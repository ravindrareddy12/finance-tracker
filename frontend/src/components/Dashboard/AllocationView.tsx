import React, { useState, useMemo } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { getAccountColors } from '../../utils/accountColors';
import { DematAccount } from '../../types';
import { ChevronDown as ChevronDownIcon, Download } from 'lucide-react';
import { downloadExcel } from '../../utils/exportExcel';

const PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
  '#a855f7','#64748b','#e11d48','#0ea5e9','#22c55e',
];

// SVG donut chart
const RADIUS = 64;
const STROKE = 26;
const C = 90; // centre x/y
const CIRC = 2 * Math.PI * RADIUS;

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
        {/* Background ring */}
        <circle cx={C} cy={C} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
        {arcs.map(arc => (
          <circle
            key={arc.label}
            cx={C} cy={C} r={RADIUS}
            fill="none"
            stroke={arc.color}
            strokeWidth={hovered === arc.label ? STROKE + 4 : STROKE}
            strokeDasharray={`${arc.dash} ${CIRC - arc.dash}`}
            strokeDashoffset={0}
            transform={`rotate(${arc.rotation} ${C} ${C})`}
            style={{ transition: 'stroke-width 0.15s', cursor: 'pointer' }}
            onMouseEnter={() => setHovered(arc.label)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      {/* Centre label */}
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

interface AllocationViewProps { currencyFilter?: 'INR' | 'USD'; title?: string; }

export default function AllocationView({ currencyFilter, title }: AllocationViewProps = {}) {
  const { holdings } = usePortfolio();
  const { config } = useAppConfig();
  const dematAccounts = config.dematAccounts;
  const [dematFilter, setDematFilter] = useState<DematAccount | 'All'>('All');

  const filtered = useMemo(() => {
    const byCurrency = currencyFilter ? holdings.filter(h => h.currency === currencyFilter) : holdings;
    return dematFilter === 'All' ? byCurrency : byCurrency.filter(h => h.dematAccount === dematFilter);
  }, [holdings, currencyFilter, dematFilter]);

  // Recompute % within the filtered set
  const totalValue = filtered.reduce((s, h) => s + (h.currentValue ?? 0), 0);

  const rows = useMemo(() => {
    // Aggregate by symbol so the same stock across multiple demat accounts appears once
    const map = new Map<string, { symbol: string; company: string; currency: string; accounts: Set<string>; currentValue: number }>();
    filtered.forEach(h => {
      const existing = map.get(h.symbol);
      if (existing) {
        existing.currentValue += h.currentValue ?? 0;
        existing.accounts.add(h.dematAccount);
      } else {
        map.set(h.symbol, {
          symbol: h.symbol,
          company: h.companyName,
          currency: h.currency,
          accounts: new Set([h.dematAccount]),
          currentValue: h.currentValue ?? 0,
        });
      }
    });

    return [...map.values()]
      .map((r, i) => ({
        symbol:       r.symbol,
        company:      r.company,
        dematAccount: r.accounts.size === 1 ? [...r.accounts][0] : 'Multiple',
        currency:     r.currency,
        currentValue: r.currentValue,
        pct:          totalValue > 0 ? (r.currentValue / totalValue) * 100 : 0,
        color:        PALETTE[i % PALETTE.length],
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [filtered, totalValue]);

  const sym    = filtered.some(h => h.currency === 'USD') ? '$' : '₹';
  const locale = sym === '$' ? 'en-US' : 'en-IN';
  const fmt    = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  // Symbols ≥1% shown individually; anything below 1% grouped as "Others"
  const donutSegments = useMemo(() => {
    if (rows.length === 0) return [];
    const main = rows.filter(r => r.pct >= 1);
    const small = rows.filter(r => r.pct < 1);
    const result = main.map(r => ({ label: r.symbol, pct: r.pct, color: r.color }));
    if (small.length > 0) {
      result.push({ label: 'Others', pct: small.reduce((s, r) => s + r.pct, 0), color: '#94a3b8' });
    }
    return result;
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Header + filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{title ?? 'US Equity Allocation'}</h2>
          <p className="text-sm text-gray-400 mt-0.5">Portfolio breakdown by symbol</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const data = rows.map((r, i) => ({
                '#': i + 1,
                Symbol: r.symbol,
                Company: r.company,
                'Demat Account': r.dematAccount,
                Currency: r.currency,
                'Current Value': +r.currentValue.toFixed(2),
                'Allocation %': +r.pct.toFixed(2),
              }));
              downloadExcel(data, `allocation-${currencyFilter ?? 'all'}`, 'Allocation');
            }}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <div className="relative">
            <select
              value={dematFilter}
              onChange={e => setDematFilter(e.target.value as DematAccount | 'All')}
              className="pl-3 pr-7 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer bg-white text-gray-700"
            >
              <option value="All">All Accounts</option>
              {dematAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="font-medium">No holdings to display</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Donut chart */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4 lg:w-72 shrink-0">
            <DonutChart segments={donutSegments} />
            {/* Mini legend */}
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

          {/* Allocation table */}
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
                    <tr key={`${r.symbol}-${r.dematAccount}`} className="hover:bg-gray-50 transition-colors">
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
                        {sym}{fmt(r.currentValue)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(r.pct, 100)}%`, background: r.color }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-12 text-right">
                            {r.pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td colSpan={4} className="px-4 py-3 text-gray-700">Total</td>
                    <td className="px-4 py-3 text-right text-gray-800">{sym}{fmt(totalValue)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs pr-6">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
