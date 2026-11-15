/**
 * The page shell shared by every static page (articles, the articles index
 * and the 404 page): head tags, structured data, header and footer.
 */
import { AUTHOR } from '../../src/config.js';
import { SITE, absoluteUrl } from '../../site.config.js';

/** Escapes text for HTML content and attribute values. */
export const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** JSON for a <script type="application/ld+json"> block ("<" escaped so it cannot close the tag). */
export const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')}</script>`;

/** The logo, inlined (light fill, for dark backgrounds). */
export const LOGO_SVG =
  '<svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 1 48 48" fill="none" aria-hidden="true" focusable="false"><path fill="#ed6516" d="M13.9 14.87a14.284 14.284 0 0 1 20.2 0l4.043-4.042a20 20 0 0 0-28.286 0z"/><path fill="#fff" d="m39.312 12.104-4.063 4.062a14.29 14.29 0 0 1 .995 16.159l-7.353-7.355-4.006-9.413h-.02V28.28l7.938 7.938a14.29 14.29 0 0 1-17.606 0l7.939-7.938V15.605l-4.027 9.365-7.355 7.355a14.29 14.29 0 0 1 .997-16.159l-4.063-4.062a20.001 20.001 0 1 0 30.624 0"/></svg>';

export const AUTHOR_LD = { '@type': 'Person', name: AUTHOR.handle.replace(/^@/, ''), url: AUTHOR.url };

/** "2026-11-15" → "15 November 2026" */
export const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * A complete HTML page.
 *
 * @param {object} page
 * @param {string} page.path       site-relative path of the page ('articles/foo/')
 * @param {string} page.root       relative (or absolute) prefix back to the site root from this page
 * @param {string} page.title      full <title>
 * @param {string} page.description meta description
 * @param {string} page.body       contents of <main>
 * @param {string} [page.ogType]   'article' or 'website'
 * @param {object[]} [page.structuredData] JSON-LD objects
 * @param {boolean} [page.index]   false for pages search engines should skip (404)
 * @param {object} [page.article]  { published, modified, section } for article OG tags
 */
export function renderPage({ path, root, title, description, body, ogType = 'website', structuredData = [], index = true, article }) {
  const url = absoluteUrl(path);
  const image = absoluteUrl(SITE.ogImage.path);
  const asset = (file) => `${root}articles/assets/${file}`;
  const head = [
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="${index ? 'index, follow, max-image-preview:large' : 'noindex, follow'}" />`,
    index ? `<link rel="canonical" href="${url}" />` : '',
    `<meta name="author" content="${esc(AUTHOR_LD.name)}" />`,
    `<meta name="theme-color" content="${SITE.themeColor}" />`,
    `<meta property="og:site_name" content="${esc(SITE.name)}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    index ? `<meta property="og:url" content="${url}" />` : '',
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="${SITE.ogImage.width}" />`,
    `<meta property="og:image:height" content="${SITE.ogImage.height}" />`,
    `<meta property="og:image:alt" content="${esc(SITE.ogImage.alt)}" />`,
    article ? `<meta property="article:published_time" content="${article.published}" />` : '',
    article ? `<meta property="article:modified_time" content="${article.modified}" />` : '',
    article?.section ? `<meta property="article:section" content="${esc(article.section)}" />` : '',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${esc(SITE.ogImage.alt)}" />`,
    `<link rel="icon" type="image/png" sizes="192x192" href="${root}icons/icon-192.png" />`,
    `<link rel="apple-touch-icon" href="${root}icons/apple-touch-icon.png" />`,
    `<link rel="manifest" href="${root}site.webmanifest" />`,
    `<link rel="preload" href="${asset('fonts/big_noodle_titling_oblique.ttf')}" as="font" type="font/ttf" crossorigin />`,
    `<link rel="stylesheet" href="${asset('site.css')}" />`,
    ...structuredData.map(jsonLd),
  ].filter(Boolean);

  return `<!doctype html>
<html lang="${SITE.language}">
  <head>
    ${head.join('\n    ')}
  </head>
  <body>
    <a class="skip" href="#content">Skip to content</a>
    <header class="top">
      <a class="brand" href="${root}">${LOGO_SVG}<span class="display">${esc(SITE.name)}</span></a>
      <nav aria-label="Site">
        <a href="${root}articles/">Articles</a>
        <a class="button" href="${root}">Open the chart</a>
      </nav>
    </header>
    <main id="content">
${body}
    </main>
    <footer class="bottom">
      <p>
        <a href="${root}">Interactive rank distribution chart</a> ·
        <a href="${root}articles/">All articles</a> ·
        <a href="${root}articles/faq/">FAQ</a>
      </p>
      <p>Made by <a href="${AUTHOR.url}" rel="author noopener">${esc(AUTHOR.handle)}</a>. ${esc(SITE.disclaimer)} Overwatch is a trademark of Blizzard Entertainment, Inc. Rank figures on this site are estimates fitted from community-submitted datapoints, not official Blizzard statistics.</p>
    </footer>
  </body>
</html>
`;
}

/** Visible breadcrumb trail plus its BreadcrumbList JSON-LD. */
export function breadcrumbs(root, trail) {
  const items = [{ name: 'Home', path: '' }, ...trail];
  const html = `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items
    .map((item, i) =>
      i === items.length - 1
        ? `<li aria-current="page">${esc(item.name)}</li>`
        : `<li><a href="${root}${item.path}">${esc(item.name)}</a></li>`,
    )
    .join('')}</ol></nav>`;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
  return { html, data };
}
