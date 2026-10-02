import React, { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { MFHolding, MFTransaction } from '../../types';

interface Props {
  holding: MFHolding;
  currentNAV?: number | null;
  initial?: MFTransaction;
  onSave: (tx: MFTransaction) => void;
  onClose: () => void;
}

export default function AddMFTransactionModal({ holding, currentNAV, initial, onSave, onClose }: Props) {
  const isEdit = !!initial;
  const [type,        setType]        = useState<'buy' | 'sell'>(initial?.type ?? 'buy');
  const [date,        setDate]        = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [units,       setUnits]       = useState(initial ? String(initial.units) : '');
  const [nav,         setNav]         = useState(initial ? String(initial.nav) : (currentNAV ? String(currentNAV) : ''));
  const [notes,       setNotes]       = useState(initial?.notes ?? '');
  const [navLoading,  setNavLoading]  = useState(false);
  const [navFetched,  setNavFetched]  = useState<{ date: string; nav: number } | null>(null);
  const [navError,    setNavError]    = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const totalUnits = holding.transactions.reduce(
    (s, t) => t.type === 'buy' ? s + t.units : s - t.units, 0
  );
  const amount  = units && nav ? parseFloat(units) * parseFloat(nav) : 0;
  const canSave = date && parseFloat(units) > 0 && parseFloat(nav) > 0 &&
    (type === 'buy' || parseFloat(units) <= totalUnits);

  // Auto-fetch NAV for selected date (skip when editing and date hasn't changed)
  const initialDate = useRef(initial?.date);
  useEffect(() => {
    if (!date || !holding.schemeCode) return;
    if (isEdit && date === initialDate.current) return; // don't re-fetch on open

    // Abort any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setNavLoading(true);
    setNavError(null);

    axios.get(`/api/mf/nav-on-dates`, {
      params: { code: holding.schemeCode, dates: date },
      signal: ctrl.signal,
    })
      .then(r => {
        const result = r.data?.results?.[0];
        if (result?.nav != null) {
          const fetched = parseFloat(result.nav.toFixed(4));
          setNav(String(fetched));
          setNavFetched({ date: result.navDate ?? date, nav: fetched });
          setNavError(null);
        } else {
          setNavFetched(null);
          setNavError('NAV not available for this date');
        }
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        setNavFetched(null);
        setNavError('Failed to fetch NAV');
      })
      .finally(() => setNavLoading(false));

    return () => ctrl.abort();
  }, [date, holding.schemeCode]);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id:     initial?.id ?? Date.now().toString(),
      type,
      date,
      units:  parseFloat(units),
      nav:    parseFloat(nav),
      amount,
      notes:  notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-semibold text-gray-800">{isEdit ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <p className="text-xs text-gray-400 truncate max-w-[260px]">{holding.fundName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Current holding info */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-500 flex justify-between">
            <span>Current units held: <strong className="text-gray-700">{totalUnits.toFixed(3)}</strong></span>
            {currentNAV && <span>Latest NAV: <strong className="text-indigo-600">₹{currentNAV}</strong></span>}
          </div>

          {/* Type toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type</label>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm font-medium">
              {(['buy', 'sell'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-2 capitalize transition-colors ${type === t ? (t === 'buy' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white') : 'text-gray-500 hover:bg-gray-50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Units</label>
              <input type="number" min="0.001" step="0.001" placeholder="0.000"
                value={units} onChange={e => setUnits(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                Current NAV (₹)
                {navLoading && <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />}
              </label>
              <input type="number" min="0" step="0.0001" placeholder="0.0000"
                value={nav} onChange={e => { setNav(e.target.value); setNavFetched(null); }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${navFetched ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200'}`} />
              {navFetched && (
                <p className="text-xs text-indigo-500 mt-0.5">NAV as of {navFetched.date}</p>
              )}
              {navError && !navLoading && (
                <p className="text-xs text-amber-500 mt-0.5">{navError}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹)</label>
              <div className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-700 font-semibold">
                {amount > 0 ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
              </div>
            </div>
          </div>

          {type === 'sell' && parseFloat(units) > totalUnits && (
            <p className="text-xs text-red-600 font-medium">
              ⚠ Cannot sell {units} units — only {totalUnits.toFixed(3)} held
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <input type="text" placeholder="e.g. SIP, redemption…"
              value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!canSave || navLoading}
            className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {isEdit ? 'Update Transaction' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}
