/**
 * Measures the rank artwork in assets/images and writes
 * src/data/iconMetrics.json: each image's pixel size and how much of its
 * rectangle the artwork actually covers.
 *
 * The site uses these to draw every rank icon at the same visual size
 * (see src/lib/ladder/iconSizing.js). Run again after adding or replacing
 * an image:
 *
 *   node scripts/measure-icons.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decodePng } from './lib/png.mjs';

const imagesDir = fileURLToPath(new URL('../assets/images/', import.meta.url));
const outFile = fileURLToPath(new URL('../src/data/iconMetrics.json', import.meta.url));

/**
 * Share of the image's rectangle that is painted: 1 for a solid rectangle,
 * about 0.4 for a spindly emblem. Partly transparent pixels count partly.
 */
function coverage({ width, height, pixels }) {
  let alpha = 0;
  for (let i = 3; i < pixels.length; i += 4) alpha += pixels[i];
  return alpha / 255 / (width * height);
}

const metrics = {};
for (const file of readdirSync(imagesDir).filter((name) => name.endsWith('.png')).sort()) {
  try {
    const image = decodePng(readFileSync(imagesDir + file));
    metrics[file] = {
      width: image.width,
      height: image.height,
      coverage: Math.round(coverage(image) * 10000) / 10000,
    };
    console.log(`${file}: ${image.width}×${image.height}, ${(metrics[file].coverage * 100).toFixed(1)}% covered`);
  } catch (error) {
    console.warn(`${file}: skipped (${error.message}).`);
  }
}

writeFileSync(outFile, `${JSON.stringify(metrics, null, 2)}\n`);
console.log(`\nWrote ${Object.keys(metrics).length} entries to src/data/iconMetrics.json`);
