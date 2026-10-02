import React, { useState, useMemo } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import axios from 'axios';
import { MFHolding, MFTransaction } from '../../types';

type Frequency = 'monthly' | 'quarterly' | 'weekly';

interface SIPRow {
  requestedDate: string;   // ISO YYYY-MM-DD
  navDate: string | null;  // DD-MM-YYYY (actual NAV date from API)
  nav: number | null;
  exact: boolean;
  units: number | null;
  amount: number;
  skip: boolean;
}

interface Props {
  holding: MFHolding;
  onSave: (transactions: MFTransaction[]) => void;
  onClose: () => void;
}

// Generate SIP dates (ISO YYYY-MM-DD)
function generateDates(
  frequency: Frequency,
  startDate: string,
  dayOfMonth: number,
  mode: 'count' | 'endDate',
  count: number,
  endDate: string,
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);

  if (frequency === 'weekly') {
    // start from the nearest occurrence of selected weekday
    let cur = new Date(start);
    const limit = mode === 'count' ? count : 520; // max 10 years of weeks
    let iterations = 0;
    while (iterations < limit) {
      const iso = cur.toISOString().slice(0, 10);
      if (mode === 'endDate' && iso > endDate) break;
      dates.push(iso);
      cur.setDate(cur.getDate() + 7);
      iterations++;
    }
  } else {
    // monthly or quarterly
    const step = frequency === 'monthly' ? 1 : 3;
    let year  = start.getFullYear();
    let month = start.getMonth(); // 0-indexed
    // Snap to the chosen dayOfMonth starting from the start month
    if (new Date(startDate).getDate() > dayOfMonth) { month++; } // push to next month if past the day
    const limit = mode === 'count' ? count : 600;
    let iterations = 0;
    while (iterations < limit) {
      const day = Math.min(dayOfMonth, new Date(year, month + 1, 0).getDate()); // clamp for short months
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (mode === 'endDate' && iso > endDate) break;
      dates.push(iso);
      month += step;
      if (month >= 12) { year += Math.floor(month / 12); month = month % 12; }
      iterations++;
    }
  }

  return dates;
}

function fmtINR(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function AddSIPModal({ holding, onSave, onClose }: Props) {
  const [frequency,   setFrequency]   = useState<Frequency>('monthly');
  const [sipAmount,   setSipAmount]   = useState('');
  const [dayOfMonth,  setDayOfMonth]  = useState(1);
  const [startDate,   setStartDate]   = useState('');
  const [mode,        setMode]        = useState<'count' | 'endDate'>('count');
  const [count,       setCount]       = useState('12');
  const [endDate,     setEndDate]     = useState('');

  const [rows,        setRows]        = useState<SIPRow[]>([]);
  const [navLoading,  setNavLoading]  = useState(false);
  const [navFetched,  setNavFetched]  = useState(false);
  const [navError,    setNavError]    = useState('');
  const [step,        setStep]        = useState<1 | 2>(1); // 1=params, 2=preview

  const amount = parseFloat(sipAmount) || 0;

  // Step 1 → Step 2: generate dates and fetch NAVs
  const handleGenerate = async () => {
    if (!startDate || amount <= 0) return;
    const dates = generateDates(frequency, startDate, dayOfMonth, mode,
      parseInt(count) || 12, endDate || new Date().toISOString().slice(0, 10));
    if (dates.length === 0) return;

    // Build skeleton rows
    const skeleton: SIPRow[] = dates.map(d => ({
      requestedDate: d, navDate: null, nav: null, exact: false, units: null, amount, skip: false,
    }));
    setRows(skeleton);
    setStep(2);
    setNavFetched(false);
    await fetchNavs(skeleton);
  };

  const fetchNavs = async (skeleton: SIPRow[]) => {
    setNavLoading(true);
    setNavError('');
    try {
      const dateParam = skeleton.map(r => r.requestedDate).join(',');
      const resp = await axios.get(`/api/mf/nav-on-dates?code=${holding.schemeCode}&dates=${dateParam}`);
      const results: { requestedDate: string; navDate: string | null; nav: number | null; exact: boolean }[] =
        resp.data?.results ?? [];

      setRows(skeleton.map(r => {
        const found = results.find(x => x.requestedDate === r.requestedDate);
        const nav   = found?.nav ?? null;
        const units = nav && nav > 0 ? amount / nav : null;
        return { ...r, navDate: found?.navDate ?? null, nav, exact: found?.exact ?? false, units, skip: nav == null };
      }));
      setNavFetched(true);
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.error ?? e.message : String(e);
      setNavError(msg);
    } finally {
      setNavLoading(false);
    }
  };

  const toggleSkip = (i: number) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, skip: !r.skip } : r));
  };

  const activeRows   = rows.filter(r => !r.skip && r.nav != null);
  const totalInvested = activeRows.reduce((s, r) => s + r.amount, 0);
  const totalUnits    = activeRows.reduce((s, r) => s + (r.units ?? 0), 0);

  const handleSave = () => {
    const txns: MFTransaction[] = activeRows.map((r, i) => ({
      id:     `${Date.now()}_sip_${i}`,
      type:   'buy',
      date:   r.requestedDate,
      units:  r.units!,
      nav:    r.nav!,
      amount: r.amount,
      notes:  'SIP',
    }));
    onSave(txns);
  };

  const canGenerate = startDate && amount > 0 && (mode === 'count' ? parseInt(count) > 0 : endDate > startDate);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Add SIP Transactions</h2>
              <p className="text-xs text-gray-400 truncate max-w-[340px]">{holding.fundName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1 — SIP Parameters */}
        {step === 1 && (
          <div className="px-6 py-5 space-y-5 overflow-y-auto">
            {/* Frequency */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Frequency</label>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm font-medium">
                {(['monthly', 'quarterly', 'weekly'] as Frequency[]).map(f => (
                  <button key={f} onClick={() => setFrequency(f)}
                    className={`flex-1 py-2 capitalize transition-colors ${frequency === f ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* SIP Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">SIP Amount (₹)</label>
                <input type="number" min="1" step="100" placeholder="5000"
                  value={sipAmount} onChange={e => setSipAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>

              {/* Day of month (not for weekly) */}
              {frequency !== 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Day of Month</label>
                  <select value={dayOfMonth} onChange={e => setDayOfMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {[1, 5, 7, 10, 15, 20, 25, 28].map(d => (
                      <option key={d} value={d}>{d}{['st','nd','rd'][d-1] ?? 'th'} of month</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Start date */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>

              {/* End mode toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-medium mb-2">
                  <button onClick={() => setMode('count')}
                    className={`flex-1 py-1.5 transition-colors ${mode === 'count' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    # Installments
                  </button>
                  <button onClick={() => setMode('endDate')}
                    className={`flex-1 py-1.5 transition-colors ${mode === 'endDate' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    End Date
                  </button>
                </div>
                {mode === 'count' ? (
                  <input type="number" min="1" max="600" placeholder="12"
                    value={count} onChange={e => setCount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                ) : (
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                )}
              </div>
            </div>

            {/* Summary preview */}
            {canGenerate && amount > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700 flex gap-6">
                <span>Installments: <strong>{mode === 'count' ? count : '—'}</strong></span>
                <span>Total ≈ <strong>₹{fmtINR(amount * (mode === 'count' ? parseInt(count) : 1))}</strong></span>
                <span>Frequency: <strong className="capitalize">{frequency}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Preview + NAV table */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* NAV fetch status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {navLoading && <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />}
                {navFetched && !navLoading && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                {navError   && <AlertCircle className="w-4 h-4 text-red-500" />}
                <span className="text-xs text-gray-500">
                  {navLoading ? 'Fetching historical NAVs…'
                    : navError ? `NAV fetch failed: ${navError}`
                    : navFetched ? `NAVs loaded · ${activeRows.length} of ${rows.length} installments active`
                    : 'Ready to fetch NAVs'}
                </span>
              </div>
              {!navLoading && (
                <button onClick={() => fetchNavs(rows)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  Retry fetch
                </button>
              )}
            </div>

            {/* Totals */}
            {navFetched && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">Active Installments</p>
                  <p className="text-lg font-bold text-gray-800">{activeRows.length}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">Total Invested</p>
                  <p className="text-lg font-bold text-indigo-700">₹{fmtINR(totalInvested)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">Total Units</p>
                  <p className="text-lg font-bold text-gray-800">{totalUnits.toFixed(3)}</p>
                </div>
              </div>
            )}

            {/* Installment table */}
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">#</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">NAV Date</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">NAV</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">Units</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">Amount</th>
                    <th className="px-3 py-2 text-center text-gray-500 font-semibold uppercase">Include</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r, i) => (
                    <tr key={r.requestedDate} className={`transition-colors ${r.skip ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {new Date(r.requestedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-2">
                        {r.navDate ? (
                          <span className={`font-medium ${r.exact ? 'text-gray-600' : 'text-amber-600'}`}>
                            {r.navDate}{!r.exact && ' *'}
                          </span>
                        ) : navFetched ? (
                          <span className="text-red-500">Not found</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">
                        {r.nav != null ? `₹${r.nav.toFixed(4)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-indigo-700">
                        {r.units != null ? r.units.toFixed(3) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-700">₹{fmtINR(r.amount)}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={!r.skip}
                          onChange={() => toggleSkip(i)}
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {navFetched && rows.some(r => !r.exact && r.nav != null) && (
              <p className="text-xs text-amber-600">* NAV date adjusted to nearest available trading day</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          {step === 2 && (
            <button onClick={() => setStep(1)}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              ← Back
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            {step === 1 ? (
              <button onClick={handleGenerate} disabled={!canGenerate}
                className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Next → Preview
              </button>
            ) : (
              <button onClick={handleSave}
                disabled={navLoading || activeRows.length === 0}
                className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Import {activeRows.length} SIP Transaction{activeRows.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
