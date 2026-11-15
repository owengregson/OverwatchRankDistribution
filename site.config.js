/**
 * Where the site is published and what it is called. Everything that needs
 * an absolute URL reads it from here: the head tags in index.html (through
 * the plugin in scripts/site/vitePlugin.js), the article pages, sitemap.xml,
 * robots.txt, the manifest and the 404 page.
 *
 * Moving to a custom domain is a one-line change to `url` (keep the trailing
 * slash), plus a CNAME file in public/ for GitHub Pages.
 */
export const SITE = {
  /** Production origin and path of the home page, with a trailing slash. */
  url: 'https://owengregson.github.io/OverwatchRankDistribution/',
  name: 'Overwatch Rank Distribution',
  shortName: 'OW Ranks',
  /** Home page meta description (about 150 characters). */
  description:
    'Interactive Overwatch rank distribution: see what percent of players are in each rank, the SR every rank starts at, and which rank is top 1%, 10% or 50%.',
  locale: 'en_US',
  language: 'en',
  themeColor: '#0a1230',
  backgroundColor: '#050a1a',
  /** Social preview, made by scripts/make-og-image.mjs into public/. */
  ogImage: { path: 'og-image.png', width: 1200, height: 630, alt: 'Overwatch Rank Distribution: a bell curve of competitive ranks from Bronze to Champion, coloured by tier.' },
  /** Shown on every page and in structured data. */
  disclaimer: 'Unofficial fan project, not affiliated with Blizzard Entertainment.',
};

/** Absolute URL for a path relative to the site root ('' is the home page). */
export const absoluteUrl = (path = '') => new URL(path, SITE.url).href;
