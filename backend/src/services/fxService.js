const fetchWithTimeout = require('../utils/fetchWithTimeout');
const quoteService     = require('./quoteService');

// ─── USD → INR exchange rate ─────────────────────────────────────────────────
// Re-fetch at most once per 30 minutes; sources are tried in order.

const FX_CACHE_TTL = 30 * 60 * 1000;
const MIN_SANE_RATE = 50;

let fxCache = { rate: null, fetchedAt: 0 };

async function fromYahoo() {
  const q = await quoteService.getQuote('USDINR=X');
  return q?.regularMarketPrice;
}

async function fromJsonApi(url) {
  const r = await fetchWithTimeout(url, { timeoutMs: 8000 });
  if (!r.ok) return null;
  const data = await r.json();
  return data?.rates?.INR;
}

const SOURCES = [
  { name: 'yahoo',            fetch: fromYahoo },
  { name: 'open.er-api',      fetch: () => fromJsonApi('https://open.er-api.com/v6/latest/USD') },
  { name: 'exchangerate-api', fetch: () => fromJsonApi('https://api.exchangerate-api.com/v4/latest/USD') },
];

// Returns { rate, source } or null when every source fails and nothing is cached.
async function getUsdInrRate() {
  const now = Date.now();
  if (fxCache.rate && (now - fxCache.fetchedAt) < FX_CACHE_TTL) {
    return { rate: fxCache.rate, source: 'cache' };
  }

  for (const source of SOURCES) {
    try {
      const rate = await source.fetch();
      if (rate && rate > MIN_SANE_RATE) {
        fxCache = { rate, fetchedAt: now };
        return { rate, source: source.name };
      }
    } catch { /* try next source */ }
  }

  if (fxCache.rate) return { rate: fxCache.rate, source: 'stale-cache' };
  return null;
}

module.exports = { getUsdInrRate };
