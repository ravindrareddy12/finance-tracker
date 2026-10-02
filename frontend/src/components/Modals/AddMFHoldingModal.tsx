import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, TrendingUp, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { MFHolding, MFTransaction } from '../../types';

interface SearchResult { schemeCode: number; schemeName: string; }

interface Props {
  onSave: (holding: MFHolding) => void;
  onClose: () => void;
}

export default function AddMFHoldingModal({ onSave, onClose }: Props) {
  const [query,          setQuery]          = useState('');
  const [results,        setResults]        = useState<SearchResult[]>([]);
  const [searching,      setSearching]      = useState(false);
  const [selected,       setSelected]       = useState<SearchResult | null>(null);
  const [liveNAV,        setLiveNAV]        = useState<number | null>(null);
  const [navLoading,     setNavLoading]     = useState(false);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [navFetched,     setNavFetched]     = useState<{ date: string; nav: number } | null>(null);
  const [navError,       setNavError]       = useState<string | null>(null);

  // Transaction fields
  const [txDate,   setTxDate]   = useState(new Date().toISOString().slice(0, 10));
  const [txUnits,  setTxUnits]  = useState('');
  const [txNAV,    setTxNAV]    = useState('');
  const [txNotes,  setTxNotes]  = useState('');

  const debounce  = useRef<ReturnType<typeof setTimeout>>();
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.length < 3) { setResults([]); setShowDropdown(false); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await axios.get(`/api/mf/search?q=${encodeURIComponent(query)}`);
        setResults(r.data?.slice(0, 10) ?? []);
        setShowDropdown(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
  }, [query]);

  const selectFund = async (fund: SearchResult) => {
    setSelected(fund);
    setQuery(fund.schemeName);
    setShowDropdown(false);
    // Fetch current NAV for the badge display only
    try {
      const r = await axios.get(`/api/mf/nav?codes=${fund.schemeCode}`);
      const nav = r.data?.results?.[0]?.currentNAV;
      if (nav) setLiveNAV(nav);
    } catch { /* ignore */ }
    // NAV field will be populated by the date-effect below
  };

  // Auto-fetch historical NAV when fund is selected and date changes
  useEffect(() => {
    if (!selected) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setNavLoading(true);
    setNavError(null);

    axios.get('/api/mf/nav-on-dates', {
      params: { code: selected.schemeCode, dates: txDate },
      signal: ctrl.signal,
    })
      .then(r => {
        const result = r.data?.results?.[0];
        if (result?.nav != null) {
          const fetched = parseFloat(result.nav.toFixed(4));
          setTxNAV(String(fetched));
          setNavFetched({ date: result.navDate ?? txDate, nav: fetched });
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
  }, [txDate, selected?.schemeCode]); // eslint-disable-line

  const txAmount = txUnits && txNAV ? (parseFloat(txUnits) * parseFloat(txNAV)) : 0;
  const canSave  = selected && txDate && parseFloat(txUnits) > 0 && parseFloat(txNAV) > 0;

  const handleSave = () => {
    if (!selected || !canSave) return;
    const tx: MFTransaction = {
      id:     Date.now().toString(),
      type:   'buy',
      date:   txDate,
      units:  parseFloat(txUnits),
      nav:    parseFloat(txNAV),
      amount: txAmount,
      notes:  txNotes || undefined,
    };
    const holding: MFHolding = {
      id:          Date.now().toString() + '_h',
      schemeCode:  String(selected.schemeCode),
      fundName:    selected.schemeName,
      transactions: [tx],
    };
    onSave(holding);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-800">Add Mutual Fund</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Fund search */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Search Fund
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
              <input
                type="text"
                placeholder="Type fund name (min 3 chars)…"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null); }}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {showDropdown && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-56 overflow-y-auto">
                  {results.map(r => (
                    <button
                      key={r.schemeCode}
                      onClick={() => selectFund(r)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0"
                    >
                      <p className="font-medium text-gray-800 leading-tight">{r.schemeName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Code: {r.schemeCode}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live NAV badge */}
          {selected && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-indigo-700 font-medium truncate max-w-[260px]">{selected.schemeName}</span>
              <span className="text-indigo-600 font-bold ml-2 shrink-0">
                {navLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : liveNAV ? `₹${liveNAV}` : '—'}
              </span>
            </div>
          )}

          {/* Transaction fields */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Initial Purchase</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Units Purchased</label>
                <input type="number" min="0" step="0.001" placeholder="0.000"
                  value={txUnits} onChange={e => setTxUnits(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                  NAV at Purchase (₹)
                  {navLoading && <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />}
                </label>
                <input type="number" min="0" step="0.0001" placeholder="0.0000"
                  value={txNAV} onChange={e => { setTxNAV(e.target.value); setNavFetched(null); }}
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
                  {txAmount > 0 ? `₹${txAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
              <input type="text" placeholder="e.g. SIP, lump sum…"
                value={txNotes} onChange={e => setTxNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!canSave || navLoading}
            className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Add Fund
          </button>
        </div>
      </div>
    </div>
  );
}
