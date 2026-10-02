const fetchWithTimeout = require('../utils/fetchWithTimeout');
const { isoToAMFI, amfiToISO } = require('../utils/amfiDate');

// ─── Mutual Fund data (AMFI India as primary source) ─────────────────────────

const AMFI_NAV_URL     = 'https://www.amfiindia.com/spages/NAVAll.txt';
const AMFI_HISTORY_URL = 'https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx';
const NAV_CACHE_TTL    = 60 * 60 * 1000; // 1 hour

// In-memory cache for today's NAV data
let navAllCache = { data: null, fetchedAt: 0 };

async function getAllNavs() {
  const now = Date.now();
  if (navAllCache.data && (now - navAllCache.fetchedAt) < NAV_CACHE_TTL) return navAllCache.data;

  const resp = await fetchWithTimeout(AMFI_NAV_URL, { timeoutMs: 15000 });
  const text = await resp.text();

  // Parse: schemeCode;isin1;isin2;schemeName;plan;option;nav;date
  const schemes = [];
  let currentAMC = '';
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Scheme Code')) continue;
    if (trimmed.includes(';')) {
      const parts = trimmed.split(';');
      if (parts.length >= 7) {
        schemes.push({
          schemeCode: parts[0].trim(),
          schemeName: `${parts[3].trim()} - ${parts[4].trim()} - ${parts[5].trim()}`,
          amcName:    currentAMC,
          nav:        parseFloat(parts[6].trim()),
          navDate:    parts[7]?.trim() ?? '',
        });
      }
    } else if (!trimmed.startsWith('Open Ended') && !trimmed.startsWith('Close Ended') && !trimmed.startsWith('Interval')) {
      currentAMC = trimmed;
    }
  }
  navAllCache = { data: schemes, fetchedAt: now };
  return schemes;
}

// Search funds by scheme or AMC name
async function searchFunds(query, limit = 20) {
  const schemes = await getAllNavs();
  const q = String(query).toLowerCase();
  return schemes
    .filter(s => s.schemeName.toLowerCase().includes(q) || s.amcName.toLowerCase().includes(q))
    .slice(0, limit)
    .map(s => ({ schemeCode: s.schemeCode, schemeName: s.schemeName, amcName: s.amcName }));
}

// Current NAV for the given scheme codes (unknown codes are skipped)
async function getNavsByCodes(codeList) {
  const schemes   = await getAllNavs();
  const schemeMap = new Map(schemes.map(s => [s.schemeCode, s]));

  return codeList
    .filter(code => schemeMap.has(code))
    .map(code => {
      const s = schemeMap.get(code);
      return {
        schemeCode:      code,
        schemeName:      s.schemeName,
        amcName:         s.amcName,
        category:        null,
        currentNAV:      s.nav,
        navDate:         s.navDate,
        previousNAV:     null,
        previousNavDate: null,
      };
    });
}

// NAVs for specific ISO dates (for SIP import), using AMFI history.
// Each date resolves to its exact NAV or the nearest previous trading day.
async function getNavsOnDates(code, dateList) {
  const sorted = [...dateList].sort();
  if (sorted.length === 0) return { results: [], schemeName: '' };

  const startIso = sorted[0];
  const endIso   = sorted[sorted.length - 1];
  // Pad start by 10 days to capture nearest previous trading day
  const startPad = new Date(new Date(startIso).getTime() - 10 * 86400_000).toISOString().slice(0, 10);

  const url  = `${AMFI_HISTORY_URL}?tp=1&mf=&frmdt=${isoToAMFI(startPad)}&todt=${isoToAMFI(endIso)}`;
  const resp = await fetchWithTimeout(url, { timeoutMs: 60000 });
  const text = await resp.text();

  // Format: schemeCode;navName;plan;option;isin1;isin2;nav;date
  const navMap = {}; // DD-Mon-YYYY → nav
  let schemeName = '';
  for (const line of text.split('\n')) {
    const parts = line.split(';');
    if (parts.length < 8) continue;
    if (parts[0].trim() !== String(code)) continue;
    const dateStr = parts[7]?.trim();
    const navVal  = parseFloat(parts[6]?.trim());
    if (dateStr && !isNaN(navVal)) {
      if (!schemeName) schemeName = parts[1]?.trim() ?? '';
      navMap[dateStr] = navVal;
    }
  }

  // Available dates newest → oldest, with their timestamps
  const available = Object.keys(navMap)
    .map(d => ({ navDate: d, ms: new Date(amfiToISO(d)).getTime() }))
    .sort((a, b) => b.ms - a.ms);

  const results = sorted.map(reqDate => {
    const reqMs = new Date(reqDate).getTime();
    const exact = available.find(a => a.ms === reqMs);
    if (exact) return { requestedDate: reqDate, navDate: exact.navDate, nav: navMap[exact.navDate], exact: true };
    const prev = available.find(a => a.ms <= reqMs);
    if (prev) return { requestedDate: reqDate, navDate: prev.navDate, nav: navMap[prev.navDate], exact: false };
    return { requestedDate: reqDate, navDate: null, nav: null, exact: false };
  });

  return { results, schemeName };
}

module.exports = { getAllNavs, searchFunds, getNavsByCodes, getNavsOnDates };
