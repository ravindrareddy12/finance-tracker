const { execFile } = require('child_process');
const fetchWithTimeout = require('../utils/fetchWithTimeout');

// ─── Yahoo Finance — PowerShell-based quote fetcher ──────────────────────────
//
// Node.js fetch() has a distinct TLS fingerprint (OpenSSL-based) that Yahoo
// Finance's CDN (Akamai/Fastly) detects as a bot and returns empty results or
// 401.  PowerShell's Invoke-WebRequest uses Windows Schannel, which has the
// same TLS fingerprint as a real browser, so Yahoo Finance serves it data.
//
// Solution: spawn one PowerShell child process per batch request.  A 5-minute
// in-memory cache and a stale-data fallback mean PowerShell is only called when
// genuinely new data is needed.

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory quote cache: SYMBOL → { data, fetchedAt }
const quoteCache = new Map();

// ── PowerShell fetcher (uses Windows Schannel TLS — same fingerprint as browsers) ──
const PS_EXE = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

// Build a self-contained PowerShell script that fetches all symbols and
// returns a JSON array of quote objects.  Tries v7 batch first (one request),
// then falls back to v8 chart per-symbol for any that didn't come back.
function buildPsScript(symbols) {
  const symList = symbols.map(s => s.replace(/'/g, '')).join(','); // sanitise
  return `
$ErrorActionPreference = 'SilentlyContinue'
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
$syms = '${symList}'.Split(',')
$results = @{}

# Attempt 1 — v7 batch (all symbols in one call)
try {
  $url7 = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symList}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,shortName,longName,currency"
  $r7 = Invoke-WebRequest $url7 -Headers @{'User-Agent'=$ua;'Accept'='application/json'} -UseBasicParsing -TimeoutSec 20
  if ($r7.StatusCode -eq 200) {
    $quotes = ($r7.Content | ConvertFrom-Json).quoteResponse.result
    foreach ($q in $quotes) {
      if ($q.regularMarketPrice) {
        $prev = $q.regularMarketPreviousClose
        $chg  = if ($q.regularMarketChange) { $q.regularMarketChange } elseif ($prev) { $q.regularMarketPrice - $prev } else { $null }
        $pct  = if ($q.regularMarketChangePercent) { $q.regularMarketChangePercent } elseif ($prev -and $chg -ne $null) { ($chg / $prev) * 100 } else { $null }
        $results[$q.symbol] = @{
          symbol=$q.symbol; longName=if($q.longName){$q.longName}else{$q.shortName};
          shortName=$q.shortName; regularMarketPrice=$q.regularMarketPrice;
          regularMarketChange=$chg; regularMarketChangePercent=$pct;
          previousClose=$prev; currency=$q.currency
        }
      }
    }
  }
} catch {}

# Attempt 2 — v8 chart per-symbol for any not found by v7
foreach ($sym in $syms) {
  if ($results.ContainsKey($sym)) { continue }
  foreach ($host in @('query1','query2')) {
    try {
      $url8 = "https://$host.finance.yahoo.com/v8/finance/chart/$sym?interval=1m&range=1d"
      $r8 = Invoke-WebRequest $url8 -Headers @{'User-Agent'=$ua;'Accept'='application/json'} -UseBasicParsing -TimeoutSec 15
      if ($r8.StatusCode -eq 200) {
        $meta = ($r8.Content | ConvertFrom-Json).chart.result[0].meta
        if ($meta -and $meta.regularMarketPrice) {
          $prev = if ($meta.chartPreviousClose) { $meta.chartPreviousClose } else { $meta.previousClose }
          $chg  = if ($prev) { $meta.regularMarketPrice - $prev } else { $null }
          $pct  = if ($prev -and $chg -ne $null) { ($chg / $prev) * 100 } else { $null }
          $results[$sym] = @{
            symbol=$meta.symbol; longName=if($meta.longName){$meta.longName}else{$meta.shortName};
            shortName=$meta.shortName; regularMarketPrice=$meta.regularMarketPrice;
            regularMarketChange=$chg; regularMarketChangePercent=$pct;
            previousClose=$prev; currency=$meta.currency
          }
          break
        }
      }
    } catch {}
  }
}

$results.Values | ConvertTo-Json -Depth 3 -Compress
`.trim();
}

async function fetchViaPS(symbols) {
  return new Promise((resolve) => {
    const script = buildPsScript(symbols);
    execFile(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 60000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err) { console.error('[Yahoo/PS] error:', err.message); return resolve([]); }
        try {
          const raw = stdout.trim();
          if (!raw) return resolve([]);
          // ConvertTo-Json returns an object when there's 1 result, array for multiple
          const parsed = JSON.parse(raw);
          const items  = Array.isArray(parsed) ? parsed : [parsed];
          const quotes = items
            .filter(q => q && q.regularMarketPrice != null)
            .map(q => ({
              symbol:                     q.symbol,
              longName:                   q.longName  || q.shortName || q.symbol,
              shortName:                  q.shortName || q.symbol,
              regularMarketPrice:         Number(q.regularMarketPrice),
              regularMarketChange:        q.regularMarketChange != null ? Number(q.regularMarketChange) : null,
              regularMarketChangePercent: q.regularMarketChangePercent != null ? Number(q.regularMarketChangePercent) : null,
              previousClose:              q.previousClose != null ? Number(q.previousClose) : null,
              currency:                   q.currency ?? null,
            }));
          resolve(quotes);
        } catch (e) {
          console.error('[Yahoo/PS] JSON parse error:', e.message, 'raw:', stdout.slice(0, 200));
          resolve([]);
        }
      });
  });
}

// ── Node fetcher (Linux/macOS servers) — Yahoo v8 chart endpoint, one request per symbol ──
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const CONCURRENCY = 6;

async function fetchChartQuote(symbol) {
  for (const host of ['query1', 'query2']) {
    try {
      const url  = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
      const resp = await fetchWithTimeout(url, { timeoutMs: 10000, headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' } });
      if (!resp.ok) continue;
      const meta = (await resp.json())?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) continue;
      const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
      const chg  = prev ? meta.regularMarketPrice - prev : null;
      return {
        symbol:                     meta.symbol ?? symbol,
        longName:                   meta.longName  || meta.shortName || symbol,
        shortName:                  meta.shortName || symbol,
        regularMarketPrice:         Number(meta.regularMarketPrice),
        regularMarketChange:        chg,
        regularMarketChangePercent: prev && chg != null ? (chg / prev) * 100 : null,
        previousClose:              prev,
        currency:                   meta.currency ?? null,
      };
    } catch { /* try next host */ }
  }
  return null;
}

async function fetchViaNode(symbols) {
  const results = [];
  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = await Promise.all(symbols.slice(i, i + CONCURRENCY).map(fetchChartQuote));
    results.push(...batch.filter(Boolean));
  }
  return results;
}

// PowerShell (Schannel TLS) on Windows; plain Node fetch elsewhere
const fetchFresh = process.platform === 'win32' ? fetchViaPS : fetchViaNode;
const ENGINE     = process.platform === 'win32' ? 'powershell-schannel' : 'node-fetch';

async function fetchQuotesBatched(symbolList) {
  const quotes = await fetchFresh(symbolList);
  const found  = new Set(quotes.map(q => q.symbol.toUpperCase()));

  // Cache fresh results
  quotes.forEach(q => quoteCache.set(q.symbol.toUpperCase(), { data: q, fetchedAt: Date.now() }));

  // For any symbol still missing, serve stale cache
  const missing = symbolList.filter(s => !found.has(s.toUpperCase()));
  missing.forEach(s => {
    const stale = quoteCache.get(s.toUpperCase());
    if (stale) {
      console.log(`[Yahoo] ${s}: serving stale cache (age ${Math.round((Date.now()-stale.fetchedAt)/1000)}s)`);
      quotes.push(stale.data);
    } else {
      console.warn(`[Yahoo] ${s}: no data and no cache`);
    }
  });

  return quotes;
}

// Return quotes for `symbolList`, serving fresh cache hits directly and
// fetching the rest.
async function getQuotes(symbolList) {
  const now    = Date.now();
  const cached = [];
  const fresh  = [];
  symbolList.forEach(s => {
    const c = quoteCache.get(s.toUpperCase());
    if (c && (now - c.fetchedAt) < CACHE_TTL) cached.push(c.data);
    else fresh.push(s);
  });

  const fetched = fresh.length ? await fetchQuotesBatched(fresh) : [];
  return [...cached, ...fetched];
}

// Single-symbol convenience wrapper (used by the FX service for USDINR=X).
async function getQuote(symbol) {
  const [quote] = await getQuotes([symbol]);
  return quote ?? null;
}

function getCacheSize() {
  return quoteCache.size;
}

module.exports = { getQuotes, getQuote, getCacheSize, ENGINE };
