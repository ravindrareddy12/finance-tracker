// Post-build step: renders each public route to static HTML with its own
// <title>, description, canonical and social tags, then writes sitemap.xml
// and llms.txt.
// nginx serves dist/<route>/index.html via `try_files $uri $uri/ /index.html`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');

const { render, PAGES, SITE, FAQ, FEATURES, canonicalFor } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.mjs')).href);

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// FAQ rich-result markup on the home page
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

function headFor(route) {
  const m = PAGES[route];
  const url = canonicalFor(route);
  const title = esc(m.title);
  const desc = esc(m.description);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<meta name="robots" content="${m.noindex ? 'noindex, nofollow' : 'index, follow'}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    route === '/' ? `<script type="application/ld+json">${faqJsonLd}</script>` : '',
  ].filter(Boolean).join('\n    ');
}

for (const route of Object.keys(PAGES)) {
  const html = template
    .replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->/, headFor(route))
    .replace('<!--app-html-->', render(route));
  const out = route === '/' ? path.join(dist, 'index.html') : path.join(dist, route.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`  prerendered ${route}`);
}

// Sitemap: indexable marketing/legal pages only
const SITEMAP_ROUTES = ['/', '/features', '/about', '/signup', '/login', '/privacy-policy'];
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_ROUTES.map(r => `  <url><loc>${canonicalFor(r)}</loc><lastmod>${today}</lastmod><priority>${r === '/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);
console.log(`  wrote sitemap.xml (${SITE.url})`);

// llms.txt (https://llmstxt.org): a plain-text summary for AI assistants and
// answer engines, built from the same feature list and FAQ as the pages
const llms = `# ${SITE.name}

> ${PAGES['/'].description}

${SITE.name} is a free personal finance web app (${SITE.url}/) and Android app for investors in India and the US. Users enter or import their own transactions; it never connects to bank or broker accounts.

## Features

${FEATURES.map(f => `- **${f.title}**: ${f.summary} ${f.points.join('; ')}.`).join('\n')}

## FAQ

${FAQ.map(f => `### ${f.q}\n\n${f.a}`).join('\n\n')}

## Pages

${SITEMAP_ROUTES.map(r => `- [${PAGES[r].title}](${canonicalFor(r)}): ${PAGES[r].description}`).join('\n')}
- [Android app on Google Play](${SITE.playStoreUrl})

## Contact

support@mypgmanager.com
`;
fs.writeFileSync(path.join(dist, 'llms.txt'), llms);
console.log('  wrote llms.txt');

fs.rmSync(ssrDir, { recursive: true, force: true });
