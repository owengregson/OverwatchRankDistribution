/**
 * Prepares the site's cursors from the .cur files in assets/cursors.
 *
 * For each .cur it takes the largest image, trims the empty space to the
 * right of and below the artwork, saves it as a PNG next to the .cur, and
 * prints the size and hotspot to use in src/styles/cursors.css.
 *
 * Why not use the .cur directly?
 *  - A browser cannot resize a .cur, but it can show a PNG at a chosen size.
 *  - Chrome replaces any custom cursor larger than 32×32 CSS pixels with the
 *    system arrow whenever it overlaps the edge of the page (for example
 *    over the footer). The artwork sits in the top-left of a 64px canvas, so
 *    trimming the empty canvas keeps the cursor under that limit without
 *    making the artwork any smaller.
 *
 * Run again after replacing a .cur:
 *
 *   node scripts/extract-cursors.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const dir = fileURLToPath(new URL('../assets/cursors/', import.meta.url));
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const RGBA = 6;

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

/** Decodes an 8-bit RGBA PNG into { width, height, pixels } (4 bytes per pixel). */
function decodePng(png) {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('not PNG-encoded');

  let header;
  const compressed = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    const type = png.toString('latin1', at + 4, at + 8);
    const body = png.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') header = body;
    if (type === 'IDAT') compressed.push(body);
    at += 12 + length;
  }

  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  if (header[8] !== 8 || header[9] !== RGBA || header[12] !== 0) {
    throw new Error('only 8-bit RGBA, non-interlaced PNGs are supported');
  }

  // Each row is a filter byte followed by the row's bytes, filtered against
  // the pixel to the left (a), the row above (b) and above-left (c).
  const raw = inflateSync(Buffer.concat(compressed));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const a = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0;
      let predicted = 0;
      if (filter === 1) predicted = a;
      else if (filter === 2) predicted = b;
      else if (filter === 3) predicted = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const [da, db, dc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        predicted = da <= db && da <= dc ? a : db <= dc ? b : c;
      }
      pixels[y * stride + x] = (value + predicted) & 0xff;
    }
  }
  return { width, height, pixels };
}

function chunk(type, body) {
  const out = Buffer.alloc(12 + body.length);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'latin1');
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}

/** Encodes RGBA pixels as a PNG. */
function encodePng({ width, height, pixels }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = RGBA;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height); // filter byte 0 (none) before each row
  for (let y = 0; y < height; y++) {
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
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
