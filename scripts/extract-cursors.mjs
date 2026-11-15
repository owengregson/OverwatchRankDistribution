/**
 * Extracts the largest image from each .cur file in assets/cursors and saves
 * it as a PNG next to it, printing the hotspot to use in src/styles/cursors.css.
 *
 * Browsers cannot resize a .cur, but they can show a PNG at a chosen size, so
 * the site uses these PNGs. Run again after replacing a .cur:
 *
 *   node scripts/extract-cursors.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../assets/cursors/', import.meta.url));
const PNG_SIGNATURE = 0x89504e47;

for (const file of readdirSync(dir).filter((name) => name.endsWith('.cur'))) {
  const bytes = readFileSync(dir + file);
  const count = bytes.readUInt16LE(4);

  // Each 16-byte directory entry: width, height, -, -, hotspot x, hotspot y, byte size, offset.
  const entries = Array.from({ length: count }, (_, i) => {
    const at = 6 + i * 16;
    return {
      size: bytes[at] || 256,
      hotspot: [bytes.readUInt16LE(at + 4), bytes.readUInt16LE(at + 6)],
      length: bytes.readUInt32LE(at + 8),
      offset: bytes.readUInt32LE(at + 12),
    };
  });
  const largest = entries.reduce((a, b) => (b.size > a.size ? b : a));

  if (bytes.readUInt32BE(largest.offset) !== PNG_SIGNATURE) {
    console.warn(`${file}: largest image is not PNG-encoded, skipped.`);
    continue;
  }

  const out = file.replace(/\.cur$/, '.png');
  writeFileSync(dir + out, bytes.subarray(largest.offset, largest.offset + largest.length));
  console.log(`${out}: ${largest.size}px, hotspot ${largest.hotspot.join(' ')}`);
}
