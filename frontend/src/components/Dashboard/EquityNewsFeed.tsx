import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { usePortfolio } from '../../context/PortfolioContext';
import { RefreshCw, Newspaper, ExternalLink, ChevronRight } from 'lucide-react';

interface Headline {
  title: string;
  summary: string | null;
  link: string;
  publisher: string;
  time: string | null;
}

interface DailyDigest {
  symbol: string;
  date: string;           // YYYY-MM-DD
  headlines: Headline[];
}

function formatDate(d: string): string {
  if (d === 'unknown') return 'Unknown date';
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (d === today)     return 'Today';
  if (d === yesterday) return 'Yesterday';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function timeLabel(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const SENTIMENT_POS = ['surge', 'soar', 'jump', 'gain', 'beat', 'record', 'profit', 'growth', 'rise', 'bull', 'upgrade', 'rally', 'boost', 'strong', 'outperform'];
const SENTIMENT_NEG = ['fall', 'drop', 'crash', 'loss', 'miss', 'decline', 'sell', 'downgrade', 'cut', 'warn', 'risk', 'slump', 'bear', 'weak', 'layoff', 'recall', 'fine', 'fraud'];

function sentiment(title: string): 'pos' | 'neg' | 'neu' {
  const low = title.toLowerCase();
  if (SENTIMENT_POS.some(w => low.includes(w))) return 'pos';
  if (SENTIMENT_NEG.some(w => low.includes(w))) return 'neg';
  return 'neu';
}

export default function EquityNewsFeed() {
  const { transactions } = usePortfolio();
  const [digests,   setDigests]   = useState<DailyDigest[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [filterSym, setFilterSym] = useState('ALL');

  const symbols = [...new Set(
    transactions.filter(t => t.currency === 'USD').map(t => t.symbol.toUpperCase())
  )].sort();

  const fetchNews = useCallback(async () => {
    if (symbols.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`/api/news?symbols=${symbols.join(',')}`);
      setDigests(data.digests ?? []);
      setLastFetch(new Date());
    } catch {
      setError('Failed to load news. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [symbols.join(',')]); // eslint-disable-line

  useEffect(() => { fetchNews(); }, [fetchNews]);

  const filtered = filterSym === 'ALL' ? digests : digests.filter(d => d.symbol === filterSym);

  // Group by date for section headers
  const byDate = new Map<string, DailyDigest[]>();
  for (const d of filtered) {
    if (!byDate.has(d.date)) byDate.set(d.date, []);
    byDate.get(d.date)!.push(d);
  }
  const dateGroups = [...byDate.entries()].sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Equity News Feed</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Daily digest · {symbols.length} holdings
            {lastFetch && (
              <span className="ml-2 text-gray-300">
                · Updated {lastFetch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button onClick={fetchNews} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Symbol filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilterSym('ALL')}
          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${filterSym === 'ALL' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'}`}>
          All Holdings
        </button>
        {symbols.map(s => (
          <button key={s} onClick={() => setFilterSym(filterSym === s ? 'ALL' : s)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${filterSym === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Empty states */}
      {symbols.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl py-20 text-center text-gray-400">
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No US equity holdings yet</p>
          <p className="text-sm mt-1">Add holdings in the US Equity Portfolio tab to see news</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Skeleton */}
      {loading && digests.length === 0 && (
        <div className="space-y-6">
          {[0, 1].map(g => (
            <div key={g}>
              <div className="h-4 bg-gray-200 rounded w-24 mb-3 animate-pulse" />
              <div className="space-y-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-5 w-14 bg-gray-200 rounded-full" />
                      <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                    <div className="space-y-3">
                      {[0, 1, 2].map(j => <div key={j} className="h-3 bg-gray-100 rounded w-full" />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daily digest sections */}
      {dateGroups.length > 0 && (
        <div className="space-y-8">
          {dateGroups.map(([date, group]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-bold text-gray-700">{formatDate(date)}</span>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{group.length} stock{group.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Cards for this date — one per symbol */}
              <div className="space-y-3">
                {group.map(digest => (
                  <DigestCard key={`${digest.symbol}-${digest.date}`} digest={digest} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && digests.length > 0 && filtered.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-12">No news for selected symbol.</div>
      )}
    </div>
  );
}

function DigestCard({ digest }: { digest: DailyDigest }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm hover:border-blue-200 transition-colors">
      {/* Card header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
          {digest.symbol}
        </span>
        <span className="text-xs text-gray-400">{digest.headlines.length} article{digest.headlines.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Headlines list */}
      <ol className="space-y-3">
        {digest.headlines.map((h, i) => {
          const sent = sentiment(h.title);
          return (
            <li key={i} className="group">
              <a href={h.link} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2.5 hover:text-blue-700 transition-colors">
                {/* Bullet / number */}
                <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 flex items-center justify-center">
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Headline */}
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 leading-snug">
                    {h.title}
                    {sent === 'pos' && <span className="ml-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">↑</span>}
                    {sent === 'neg' && <span className="ml-1.5 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">↓</span>}
                  </p>

                  {/* Summary */}
                  {h.summary && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{h.summary}</p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                    {h.publisher && <span className="font-medium">{h.publisher}</span>}
                    {h.time && <><span>·</span><span>{timeLabel(h.time)}</span></>}
                    <ExternalLink className="w-2.5 h-2.5 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
                  </div>
                </div>
              </a>

              {i < digest.headlines.length - 1 && (
                <div className="mt-3 border-t border-gray-50" />
              )}
            </li>
          );
        })}
      </ol>

      {/* Read more link */}
      {digest.headlines[0]?.link && (
        <a href={`https://finance.yahoo.com/quote/${digest.symbol}/news/`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-xs text-blue-500 hover:text-blue-700 font-medium">
          More {digest.symbol} news <ChevronRight className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
