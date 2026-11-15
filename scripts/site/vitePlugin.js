/**
 * Vite plugin for the crawlable side of the site.
 *
 * - Fills the {{...}} placeholders in index.html from site.config.js, so the
 *   production URL and site name live in one place.
 * - On `vite build`, renders the static pages (scripts/site/render.js) into
 *   the output: articles/<slug>/index.html, articles/index.html, 404.html,
 *   sitemap.xml, robots.txt, site.webmanifest and the article stylesheet.
 * - On `vite` (dev), serves the same files from memory, re-rendered on every
 *   request, so article edits show up on refresh.
 */
import { SITE, absoluteUrl } from '../../site.config.js';
import { AUTHOR_LD } from './html.js';
import { homeArticleLinks, renderSite } from './render.js';

const PLACEHOLDERS = () => ({
  SITE_URL: SITE.url,
  SITE_NAME: SITE.name,
  SITE_DESCRIPTION: SITE.description,
  SITE_LOCALE: SITE.locale,
  THEME_COLOR: SITE.themeColor,
  OG_IMAGE: absoluteUrl(SITE.ogImage.path),
  OG_IMAGE_WIDTH: String(SITE.ogImage.width),
  OG_IMAGE_HEIGHT: String(SITE.ogImage.height),
  OG_IMAGE_ALT: SITE.ogImage.alt,
  AUTHOR_NAME: AUTHOR_LD.name,
  AUTHOR_URL: AUTHOR_LD.url,
  ARTICLE_LINKS: homeArticleLinks(),
});

const TYPES = { html: 'text/html', xml: 'application/xml', txt: 'text/plain', css: 'text/css', webmanifest: 'application/manifest+json', ttf: 'font/ttf', woff2: 'font/woff2' };

export function staticSite() {
  return {
    name: 'static-site',

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const values = PLACEHOLDERS();
        return html.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
          if (!(key in values)) throw new Error(`index.html: unknown placeholder ${match}`);
          // Placeholders sit in attribute values and JSON-LD strings, which
          // escape differently, so the plain-text values must need neither.
          // ARTICLE_LINKS is markup.
          if (key !== 'ARTICLE_LINKS' && /[&<>"\\]/.test(values[key])) {
            throw new Error(`site.config.js: ${key} must not contain & < > " or \\ (it is used in index.html as is).`);
          }
          return values[key];
        });
      },
    },

    generateBundle() {
      const { files } = renderSite();
      for (const [fileName, source] of files) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        let path = decodeURIComponent(url.pathname).replace(/^\//, '');
        if (path === 'articles' || path.startsWith('articles/')) {
          if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) {
            res.statusCode = 301;
            res.setHeader('Location', `/${path}/`);
            return res.end();
          }
          if (path.endsWith('/')) path += 'index.html';
        }
        if (!['sitemap.xml', 'robots.txt', 'site.webmanifest', '404.html'].includes(path) && !path.startsWith('articles/')) return next();
        let body;
        try {
          body = renderSite().files.get(path);
        } catch (error) {
          return next(error);
        }
        if (body === undefined) return next();
        res.setHeader('Content-Type', TYPES[path.split('.').pop()] ?? 'application/octet-stream');
        res.end(body);
      });
    },
  };
}
