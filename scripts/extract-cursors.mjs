/**
 * Prepares the site's cursors from the .cur files in assets/cursors.
 *
 * For each .cur it takes the largest image, trims the empty space to the
 * right of and below the artwork, saves it as a PNG next to the .cur, and
 * prints the size and hotspot to copy into src/lib/cursor/cursors.js.
 *
 * The site draws its cursor itself (see CustomCursor.svelte) and needs
 * plain images for that; a .cur file can only be used as a system cursor.
 *
 * Run again after replacing a .cur:
 *
 *   node scripts/extract-cursors.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './lib/png.mjs';

const dir = fileURLToPath(new URL('../assets/cursors/', import.meta.url));

/** The largest image stored in a .cur, with its hotspot. */
function largestImage(cur) {
  const count = cur.readUInt16LE(4);
  // Each 16-byte directory entry: width, height, -, -, hotspot x, hotspot y, byte length, offset.
  const entries = Array.from({ length: count }, (_, i) => {
    const at = 6 + i * 16;
    const length = cur.readUInt32LE(at + 8);
    const offset = cur.readUInt32LE(at + 12);
    return {
      size: cur[at] || 256,
      hotspot: [cur.readUInt16LE(at + 4), cur.readUInt16LE(at + 6)],
      data: cur.subarray(offset, offset + length),
    };
  });
  return entries.reduce((a, b) => (b.size > a.size ? b : a));
}

/**
 * Trims fully transparent columns on the right and rows at the bottom.
 * The top-left corner stays put, so the hotspot does not move.
 */
function trim({ width, height, pixels }) {
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 0) {
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
    }
  }
  const trimmed = Buffer.alloc(right * bottom * 4);
  for (let y = 0; y < bottom; y++) {
    pixels.copy(trimmed, y * right * 4, y * width * 4, (y * width + right) * 4);
  }
  return { width: right, height: bottom, pixels: trimmed };
}

for (const file of readdirSync(dir).filter((name) => name.endsWith('.cur'))) {
  const { hotspot, data } = largestImage(readFileSync(dir + file));
  try {
    const image = trim(decodePng(data));
    const out = file.replace(/\.cur$/, '.png');
    writeFileSync(dir + out, encodePng(image));
    console.log(`${out}: ${image.width}×${image.height}px, hotspot ${hotspot.join(' ')}`);
  } catch (error) {
    console.warn(`${file}: skipped (${error.message}).`);
  }
}
