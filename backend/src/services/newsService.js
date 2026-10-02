const fetchWithTimeout = require('../utils/fetchWithTimeout');

// ─── Equity news feed (RSS-based daily digest) ───────────────────────────────

const NEWS_CACHE_TTL    = 15 * 60 * 1000;
const MAX_DIGEST_DAYS   = 7;
const HEADLINES_PER_DAY = 4;
const BATCH_SIZE        = 8;
const BATCH_DELAY_MS    = 200;

const newsCache = new Map(); // symbol → { digests, fetchedAt }

function parseRSS(xml) {
  const items = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRx.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
      const x = r.exec(block);
      return x ? (x[1] ?? x[2] ?? '').trim() : '';
    };
    const title   = get('title');
    const desc    = get('description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const link    = get('link') || get('guid');
    const pubDate = get('pubDate');
    const pub     = get('source') || '';
    if (!title) continue;
    const date = pubDate ? new Date(pubDate) : null;
    items.push({ title, summary: desc || null, link, publisher: pub, publishedAt: date?.toISOString() ?? null });
  }
  return items;
}

// Source 1: Yahoo Finance RSS
async function fetchYahooRSS(symbol) {
  const url  = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
  const resp = await fetchWithTimeout(url, { timeoutMs: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  return resp.ok ? parseRSS(await resp.text()) : [];
}

// Source 2: Yahoo Finance search API (uses providerPublishTime unix ts)
async function fetchYahooSearchNews(symbol) {
  const url  = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=8&quotesCount=0`;
  const resp = await fetchWithTimeout(url, { timeoutMs: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.news ?? []).map(n => ({
    title:       n.title ?? '',
    summary:     n.summary ?? null,
    link:        n.link ?? '',
    publisher:   n.publisher ?? '',
    publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
  }));
}

// Group articles into one digest per calendar date (UTC), newest first
function toDailyDigests(symbol, articles) {
  const byDate = new Map();
  for (const a of articles) {
    const dateStr = a.publishedAt ? a.publishedAt.slice(0, 10) : 'unknown';
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr).push(a);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, MAX_DIGEST_DAYS)
    .map(([date, arts]) => ({
      symbol,
      date,
      headlines: arts.slice(0, HEADLINES_PER_DAY).map(a => ({
        title:     a.title,
        summary:   a.summary,
        link:      a.link,
        publisher: a.publisher,
        time:      a.publishedAt,
      })),
    }));
}

async function getDigestsForSymbol(symbol) {
  const cached = newsCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < NEWS_CACHE_TTL) return cached.digests;

  let articles = await fetchYahooRSS(symbol).catch(() => []);
  if (articles.length === 0) articles = await fetchYahooSearchNews(symbol).catch(() => []);

  const digests = toDailyDigests(symbol, articles);
  newsCache.set(symbol, { digests, fetchedAt: Date.now() });
  return digests;
}

// Digests for many symbols, fetched in small batches to avoid hammering Yahoo.
// Sorted by most recent date first, then by symbol.
async function getDigests(symbolList) {
  const all = [];
  for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
    const batch   = symbolList.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(getDigestsForSymbol));
    results.forEach(digests => all.push(...digests));
    if (i + BATCH_SIZE < symbolList.length) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }
  return all.sort((a, b) => b.date.localeCompare(a.date) || a.symbol.localeCompare(b.symbol));
}

module.exports = { getDigests };
