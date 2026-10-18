import { api } from './client';
import type { BackupResponse, MFNav, MFSearchResult, NavOnDate, StockQuote } from '@/types/models';

export const portfolioApi = {
  /** The signed-in user's saved data (same store the web app syncs to). */
  backup: () => api.get<BackupResponse>('/backup').then(r => r.data),

  /** Upsert only the given keys; other keys on the server are untouched. */
  saveKeys: (data: Record<string, unknown>) =>
    api.post<{ ok: true; savedAt: string; keys: number }>('/backup', { data }).then(r => r.data),

  quotes: (symbols: string[]) =>
    api
      .get<{ quoteResponse: { result: StockQuote[] } }>('/quotes', { params: { symbols: symbols.join(',') } })
      .then(r => r.data.quoteResponse.result),

  mfNavs: (codes: string[]) =>
    api.get<{ results: MFNav[] }>('/mf/nav', { params: { codes: codes.join(',') } }).then(r => r.data.results),

  mfSearch: (q: string) => api.get<MFSearchResult[]>('/mf/search', { params: { q } }).then(r => r.data),

  /** NAV for each ISO date (exact, or the nearest earlier trading day). */
  navOnDates: (code: string, dates: string[]) =>
    api
      .get<{ results: NavOnDate[] }>('/mf/nav-on-dates', { params: { code, dates: dates.join(',') }, timeout: 60_000 })
      .then(r => r.data.results),

  usdInr: () => api.get<{ rate: number; source: string }>('/fx/usd-inr').then(r => r.data.rate),
};
