import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const fromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Relative base so the built site works from any sub-path or static host.
  base: './',
  plugins: [svelte()],
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
