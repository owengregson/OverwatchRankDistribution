/**
 * Checks the built site in dist/ (run after `npm run build`):
 *
 * - every internal link, script, stylesheet, image and icon in every HTML
 *   page resolves to a file in dist/ (absolute production URLs included);
 * - every sitemap URL exists and is the canonical URL of its page;
 * - robots.txt, the manifest and its icons, and the preview image are there;
 * - every JSON-LD block parses, and articles carry Article + BreadcrumbList;
 * - each article has one <h1>, a unique title and description, and
 *   700–1500 words of prose.
 *
 *   npm run check:site
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from '../site.config.js';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const errors = [];
const fail = (message) => errors.push(message);

if (!existsSync(dist)) {
  console.error('dist/ not found: run `npm run build` first.');
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const files = walk(dist).map((path) => relative(dist, path).split(sep).join('/'));
const htmlFiles = files.filter((f) => f.endsWith('.html'));

/** dist-relative file for a URL on the production site, or null for other hosts. */
function localFile(url) {
  if (!url.href.startsWith(SITE.url)) return null;
  let path = decodeURIComponent(url.pathname.slice(new URL(SITE.url).pathname.length));
  if (path === '' || path.endsWith('/')) path += 'index.html';
  return path;
}
const exists = (path) => files.includes(path);

const attr = (tag, name) => new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag)?.[1];
const metaContent = (html, key) => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (attr(tag, 'property') === key || attr(tag, 'name') === key) return attr(tag, 'content');
  }
  return undefined;
};

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();
let checkedLinks = 0;

for (const file of htmlFiles) {
  const html = readFileSync(join(dist, file), 'utf8');
  // 404.html is served at any missing path, so it must only use absolute URLs.
  const pageUrl = new URL(file === '404.html' ? 'some/missing/page/' : file.replace(/index\.html$/, ''), SITE.url);

  const refs = [];
  for (const tag of html.match(/<(a|link|script|img|source)\b[^>]*>/gi) ?? []) {
    for (const name of ['href', 'src']) {
      const value = attr(tag, name);
      if (value !== undefined) refs.push(value);
    }
  }
  for (const key of ['og:url', 'og:image', 'twitter:image']) {
    const value = metaContent(html, key);
    if (value !== undefined) {
      if (!value.startsWith('https://')) fail(`${file}: ${key} must be an absolute URL, got "${value}"`);
      refs.push(value);
    }
  }

  for (const ref of refs) {
    if (/^(mailto:|tel:|#|data:)/.test(ref)) continue;
    const url = new URL(ref, pageUrl);
    const path = localFile(url);
    if (path === null) continue; // another host
    checkedLinks++;
    if (!exists(path)) fail(`${file}: "${ref}" → ${path} does not exist in dist/`);
  }

  const canonical = /<link\b[^>]*rel="canonical"[^>]*>/i.exec(html);
  if (canonical) canonicals.set(attr(canonical[0], 'href'), file);
  else if (file !== '404.html') fail(`${file}: no canonical link`);

  // Structured data.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const types = [];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block);
      for (const item of data['@graph'] ?? [data]) types.push(item['@type']);
    } catch (error) {
      fail(`${file}: JSON-LD does not parse (${error.message})`);
    }
  }

  const title = /<title>([^<]*)<\/title>/i.exec(html)?.[1];
  if (file.startsWith('articles/')) {
    const description = metaContent(html, 'description');
    if (titles.has(title)) fail(`${file}: same <title> as ${titles.get(title)}`);
    if (descriptions.has(description)) fail(`${file}: same description as ${descriptions.get(description)}`);
    titles.set(title, file);
    descriptions.set(description, file);
    if (!description || description.length > 200) fail(`${file}: description missing or longer than 200 characters`);
    const h1s = html.match(/<h1\b/gi)?.length ?? 0;
    if (h1s !== 1) fail(`${file}: ${h1s} <h1> elements (want 1)`);
  }
  if (/^articles\/[^/]+\/index\.html$/.test(file)) {
    for (const type of ['Article', 'BreadcrumbList']) {
      if (!types.includes(type)) fail(`${file}: missing ${type} JSON-LD`);
    }
    const prose = /<div class="prose">([\s\S]*?)<\/div>\s*<section class="related"/.exec(html)?.[1] ?? '';
    const words = prose
      .replace(/<(table|figure|svg|aside)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .split(/\s+/)
      .filter((w) => /[a-z0-9]/i.test(w)).length;
    console.log(`  ${file.padEnd(52)} ${String(words).padStart(5)} words of prose`);
    if (words < 700 || words > 1500) fail(`${file}: ${words} words of prose (want 700–1500)`);
  }
  if (file === 'index.html' && !types.includes('WebSite')) fail('index.html: missing WebSite JSON-LD');
  if (/Overwatch_Icon/.test(html) && file !== 'index.html') fail(`${file}: references Overwatch_Icon`);
}

// Sitemap.
const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!locs.length) fail('sitemap.xml: no URLs');
for (const loc of locs) {
  const path = localFile(new URL(loc));
  if (!path || !exists(path)) fail(`sitemap.xml: ${loc} has no file in dist/`);
  else if (canonicals.get(loc) !== path) fail(`sitemap.xml: ${loc} is not the canonical URL of ${path}`);
}
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
if (lastmods.length !== locs.length || lastmods.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) fail('sitemap.xml: every URL needs a YYYY-MM-DD lastmod');
for (const file of htmlFiles.filter((f) => f.startsWith('articles/') || f === 'index.html')) {
  const url = new URL(file.replace(/index\.html$/, ''), SITE.url).href;
  if (!locs.includes(url)) fail(`sitemap.xml: missing ${url}`);
}

// robots.txt, manifest, preview image.
const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
const robotsSitemap = /^Sitemap:\s*(\S+)/m.exec(robots)?.[1];
if (!robotsSitemap || localFile(new URL(robotsSitemap)) !== 'sitemap.xml') fail('robots.txt: Sitemap line missing or wrong');

const manifest = JSON.parse(readFileSync(join(dist, 'site.webmanifest'), 'utf8'));
for (const icon of manifest.icons) {
  const path = localFile(new URL(icon.src, new URL('site.webmanifest', SITE.url)));
  if (!exists(path)) fail(`site.webmanifest: icon ${icon.src} does not exist`);
}

const og = readFileSync(join(dist, SITE.ogImage.path));
const [w, h] = [og.readUInt32BE(16), og.readUInt32BE(20)];
if (w !== SITE.ogImage.width || h !== SITE.ogImage.height) fail(`${SITE.ogImage.path}: ${w}×${h}, expected ${SITE.ogImage.width}×${SITE.ogImage.height}`);

console.log(`\nChecked ${htmlFiles.length} pages, ${checkedLinks} internal links, ${locs.length} sitemap URLs.`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log('All good.');
