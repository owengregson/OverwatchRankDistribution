import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { staticSite } from './scripts/site/vitePlugin.js';

const fromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Relative base so the built site works from any sub-path or static host.
  base: './',
  // staticSite: head tags from site.config.js, plus the article pages,
  // sitemap, robots.txt, manifest and 404 page (see scripts/site).
  plugins: [svelte(), staticSite()],
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      '@assets': fromRoot('./assets'),
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
