// Post-build check of the prerendered pages: every referenced image exists, has
// the declared size and type, and fits what Google / WhatsApp / LinkedIn / X
// accept. Errors fail the build; warnings are printed only.
// nginx answers missing files with index.html (200), so a broken image would
// otherwise go unnoticed in production.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const SITE = 'https://finance.mypgmanager.com';

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// ── Image headers ────────────────────────────────────────────────────────────
function imageInfo(file) {
  const b = fs.readFileSync(file);
  if (b.subarray(1, 4).toString() === 'PNG') return { type: 'image/png', width: b.readUInt32BE(16), height: b.readUInt32BE(20), bytes: b.length };
  if (b[0] === 0xff && b[1] === 0xd8) {
    // Walk JPEG segments to the frame header (SOF0–SOF15, except DHT/JPG/DAC)
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
        return { type: 'image/jpeg', height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7), bytes: b.length };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
    return { type: 'image/jpeg', bytes: b.length };
  }
  if (b.readUInt16LE(0) === 0 && b.readUInt16LE(2) === 1) {
    const sizes = [];
    for (let k = 0; k < b.readUInt16LE(4); k++) sizes.push(b[6 + 16 * k] || 256);
    return { type: 'image/x-icon', width: Math.max(...sizes), height: Math.max(...sizes), sizes, bytes: b.length };
  }
  if (b.subarray(0, 200).toString().includes('<svg')) return { type: 'image/svg+xml', bytes: b.length };
  return { type: 'unknown', bytes: b.length };
}

// Map a page reference (absolute site URL or root path) to a file in dist
function resolveLocal(ref) {
  if (!ref) return null;
  let p = ref.startsWith(SITE) ? ref.slice(SITE.length) : ref;
  if (!p.startsWith('/')) return null; // external
  p = p.split(/[?#]/)[0];
  return path.join(dist, p);
}

function checkImage(where, ref, rules = {}) {
  const file = resolveLocal(ref);
  if (!file) return null;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { err(where, `${ref} does not exist in dist`); return null; }
  const info = imageInfo(file);
  if (info.type === 'unknown') err(where, `${ref} is not a recognised image`);
  if (rules.type && info.type !== rules.type) err(where, `${ref} is ${info.type}, declared ${rules.type}`);
  if (rules.width && info.width !== rules.width) err(where, `${ref} is ${info.width}px wide, declared ${rules.width}`);
  if (rules.height && info.height !== rules.height) err(where, `${ref} is ${info.height}px high, declared ${rules.height}`);
  return info;
}

const attr = (html, re) => html.match(re)?.[1];
const metaProp = (html, key) => attr(html, new RegExp(`<meta[^>]+(?:property|name)="${key}"[^>]+content="([^"]*)"`));

// ── Pages ────────────────────────────────────────────────────────────────────
const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'assets') walk(p);
    else if (e.name === 'index.html') pages.push(p);
  }
})(dist);

const checkedShareImages = new Set();

for (const file of pages) {
  const route = '/' + path.relative(dist, path.dirname(file)).replace(/\\/g, '/');
  const where = route === '/' ? '/' : `${route}/`;
  const html = fs.readFileSync(file, 'utf8');
  const noindex = /name="robots" content="noindex/.test(html);

  const title = attr(html, /<title>([^<]*)<\/title>/);
  const desc = metaProp(html, 'description');
  if (!title) err(where, 'missing <title>');
  else if (!noindex && title.length > 70) warn(where, `title is ${title.length} chars (Google shows ~60)`);
  if (!desc) err(where, 'missing meta description');
  else if (!noindex && (desc.length < 70 || desc.length > 165)) warn(where, `description is ${desc.length} chars (aim for 70–160)`);
  if (!noindex && !attr(html, /<link rel="canonical" href="([^"]+)"/)) err(where, 'missing canonical link');
  if (!html.includes('google-site-verification')) err(where, 'missing google-site-verification meta tag');

  // Social share image (Open Graph + X)
  const og = metaProp(html, 'og:image');
  if (!og) err(where, 'missing og:image');
  else if (!og.startsWith('https://')) err(where, 'og:image must be an absolute https URL');
  else if (!checkedShareImages.has(og)) {
    checkedShareImages.add(og);
    const w = Number(metaProp(html, 'og:image:width'));
    const h = Number(metaProp(html, 'og:image:height'));
    const info = checkImage(where, og, { type: metaProp(html, 'og:image:type'), width: w || undefined, height: h || undefined });
    if (info) {
      if (info.type === 'image/svg+xml') err(where, 'og:image cannot be SVG — social sites ignore it');
      if (info.width < 1200 || info.height < 630) warn(where, `og:image is ${info.width}x${info.height}; 1200x630 is recommended`);
      if (Math.abs(info.width / info.height - 1.91) > 0.05) warn(where, `og:image ratio ${(info.width / info.height).toFixed(2)}:1; 1.91:1 avoids cropping`);
      if (info.bytes > 300 * 1024) err(where, `og:image is ${Math.round(info.bytes / 1024)} KB; WhatsApp skips previews over ~300 KB`);
      if (info.bytes > 5 * 1024 * 1024) err(where, 'og:image over 5 MB (X/Twitter limit)');
    }
  }
  const tw = metaProp(html, 'twitter:image');
  if (tw && tw !== og) checkImage(where, tw);
  if (!metaProp(html, 'og:image:alt')) warn(where, 'missing og:image:alt');

  // Icons — Google Search wants a square favicon whose size is a multiple of 48px
  for (const m of html.matchAll(/<link rel="(icon|apple-touch-icon)"([^>]*)>/g)) {
    const href = attr(m[2], /href="([^"]+)"/);
    const sizes = attr(m[2], /sizes="(\d+)x(\d+)"/);
    const info = checkImage(where, href, sizes ? { width: Number(sizes), height: Number(sizes) } : {});
    if (info && m[1] === 'icon' && info.width && (info.width !== info.height || info.width % 48)) {
      warn(where, `${href} is ${info.width}x${info.height}; Google prefers square multiples of 48px`);
    }
  }

  // Images in the rendered page
  for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) checkImage(where, m[1]);
  for (const m of html.matchAll(/<img(?![^>]*\balt=)[^>]*>/g)) err(where, `<img> without alt: ${m[0].slice(0, 80)}`);

  // Structured data must be valid JSON and its image/logo URLs must exist
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const json = JSON.stringify(JSON.parse(m[1]));
      for (const u of json.matchAll(/"(?:logo|image)":"([^"]+)"/g)) checkImage(where, u[1]);
    } catch (e) {
      err(where, `invalid JSON-LD: ${e.message}`);
    }
  }
}

// ── Manifest icons ───────────────────────────────────────────────────────────
const manifestPath = path.join(dist, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const icon of manifest.icons ?? []) {
    const [w, h] = icon.sizes.split('x').map(Number);
    checkImage('manifest.json', icon.src, { type: icon.type, width: w, height: h });
  }
}
if (!fs.existsSync(path.join(dist, 'favicon.ico'))) err('/favicon.ico', 'missing (browsers and crawlers request it directly)');

// ── Sitemap ──────────────────────────────────────────────────────────────────
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const file = path.join(resolveLocal(loc), 'index.html');
  if (!fs.existsSync(file)) err('sitemap.xml', `${loc} has no prerendered page`);
}

// ── AI crawlers ──────────────────────────────────────────────────────────────
// Without the file nginx answers /llms.txt with index.html (a soft 404)
if (!fs.existsSync(path.join(dist, 'llms.txt'))) err('/llms.txt', 'missing');
const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const faqCount = (home.match(/"@type":"Question"/g) || []).length;
const detailsCount = (home.match(/<details/g) || []).length;
if (faqCount !== detailsCount) err('/', `FAQPage markup has ${faqCount} questions but the page shows ${detailsCount}`);

// ── Report ───────────────────────────────────────────────────────────────────
for (const w of warnings) console.log(`  ⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ✖ ${e}`);
  console.error(`\nSEO/image check failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`  ✔ SEO/image check passed — ${pages.length} pages, ${checkedShareImages.size} share image(s)`);
