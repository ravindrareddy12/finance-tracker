const fetchWithTimeout = require('../utils/fetchWithTimeout');

// ─── YouTube channel feed ────────────────────────────────────────────────────

const VIDEO_CACHE_TTL = 30 * 60 * 1000;
const MAX_VIDEOS      = 15;
const BROWSER_UA      = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Verified channel IDs (resolved by fetching RSS and confirming entries > 0)
const KNOWN_CHANNEL_IDS = {
  '@AkshatShrivastava': 'UCqW8jxh4tH1Z1sWPbkGWL4g',
  '@SahilBhadviya':     'UCdc6ObxhdQ8eZIFquU2xolA',
};

const channelIdCache = new Map(Object.entries(KNOWN_CHANNEL_IDS));
const videoCache     = new Map(); // channelId → { videos, fetchedAt }

const feedUrl = (channelId) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

// Resolve an @handle to a channel ID by scraping the channel page and
// picking the first UC* ID whose RSS feed has entries.
async function resolveChannelId(handle) {
  const norm = handle.startsWith('@') ? handle : '@' + handle;
  if (channelIdCache.has(norm)) return channelIdCache.get(norm);

  try {
    const resp = await fetchWithTimeout(`https://www.youtube.com/${norm}`, {
      timeoutMs: 12000,
      headers: { 'User-Agent': BROWSER_UA },
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const candidates = [...new Set([...html.matchAll(/"(UC[A-Za-z0-9_-]{22})"/g)].map(m => m[1]))];

    for (const id of candidates) {
      const r = await fetch(feedUrl(id), { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) continue;
      const xml = await r.text();
      if ((xml.match(/<entry>/g) ?? []).length > 0) {
        channelIdCache.set(norm, id);
        return id;
      }
    }
  } catch { /* unresolved */ }
  return null;
}

function parseYouTubeAtom(xml) {
  const videos = [];
  const entryRx = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRx.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
      const x = r.exec(block);
      return x ? x[1].replace(/<[^>]+>/g, '').trim() : '';
    };
    const attr = (tag, attrName) => {
      const r = new RegExp(`<${tag}[^>]*${attrName}="([^"]+)"`);
      const x = r.exec(block);
      return x ? x[1] : '';
    };
    const videoId   = get('yt:videoId');
    const title     = get('title');
    const published = get('published');
    const updated   = get('updated');
    const author    = get('name');
    const descMatch = /<media:description>([\s\S]*?)<\/media:description>/.exec(block);
    const desc      = descMatch ? descMatch[1].trim().slice(0, 300) : '';
    const thumb     = attr('media:thumbnail', 'url')
      || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

    if (!videoId || !title) continue;
    videos.push({
      videoId,
      title,
      description: desc || null,
      thumbnail:   thumb,
      publishedAt: published || updated || null,
      channelName: author,
      url:         `https://www.youtube.com/watch?v=${videoId}`,
    });
  }
  return videos;
}

async function getVideos(channelId) {
  const cached = videoCache.get(channelId);
  if (cached && Date.now() - cached.fetchedAt < VIDEO_CACHE_TTL) return cached.videos;

  try {
    const resp = await fetchWithTimeout(feedUrl(channelId), {
      timeoutMs: 12000,
      headers: { 'User-Agent': BROWSER_UA },
    });
    if (!resp.ok) return [];
    const videos = parseYouTubeAtom(await resp.text()).slice(0, MAX_VIDEOS);
    videoCache.set(channelId, { videos, fetchedAt: Date.now() });
    return videos;
  } catch { return []; }
}

// Latest videos for each handle, in the order requested
async function getChannels(handleList) {
  return Promise.all(handleList.map(async (handle) => {
    const channelId = await resolveChannelId(handle);
    if (!channelId) return { handle, channelId: null, videos: [], error: 'Could not resolve channel' };
    return { handle, channelId, videos: await getVideos(channelId) };
  }));
}

module.exports = { getChannels };
