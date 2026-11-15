/**
 * Minimal TrueType reader for the image scripts: glyph outlines (simple and
 * composite glyphs), advance widths and the Unicode cmap (format 4). No
 * hinting or kerning; meant for large display text such as headlines.
 */
import { quadratic } from './raster.mjs';

export function loadFont(buffer) {
  const tables = {};
  const count = buffer.readUInt16BE(4);
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    tables[buffer.toString('latin1', at, at + 4)] = buffer.readUInt32BE(at + 8);
  }

  const unitsPerEm = buffer.readUInt16BE(tables.head + 18);
  const longLoca = buffer.readInt16BE(tables.head + 50) === 1;
  const numGlyphs = buffer.readUInt16BE(tables.maxp + 4);
  const numHMetrics = buffer.readUInt16BE(tables.hhea + 34);
  const ascent = buffer.readInt16BE(tables.hhea + 4);

  const advance = (glyph) => buffer.readUInt16BE(tables.hmtx + 4 * Math.min(glyph, numHMetrics - 1));
  const glyphOffset = (glyph) =>
    longLoca
      ? buffer.readUInt32BE(tables.loca + glyph * 4)
      : buffer.readUInt16BE(tables.loca + glyph * 2) * 2;

  // cmap: find a Unicode format-4 subtable.
  const cmap = new Map();
  const subtables = buffer.readUInt16BE(tables.cmap + 2);
  for (let i = 0; i < subtables; i++) {
    const rec = tables.cmap + 4 + i * 8;
    const platform = buffer.readUInt16BE(rec);
    const encoding = buffer.readUInt16BE(rec + 2);
    const sub = tables.cmap + buffer.readUInt32BE(rec + 4);
    if (buffer.readUInt16BE(sub) !== 4 || !(platform === 0 || (platform === 3 && encoding === 1))) continue;
    const segs = buffer.readUInt16BE(sub + 6) / 2;
    const ends = sub + 14;
    const starts = ends + segs * 2 + 2;
    const deltas = starts + segs * 2;
    const ranges = deltas + segs * 2;
    for (let s = 0; s < segs; s++) {
      const end = buffer.readUInt16BE(ends + s * 2);
      const start = buffer.readUInt16BE(starts + s * 2);
      const delta = buffer.readInt16BE(deltas + s * 2);
      const range = buffer.readUInt16BE(ranges + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let glyph;
        if (range === 0) glyph = (c + delta) & 0xffff;
        else {
          const at = ranges + s * 2 + range + (c - start) * 2;
          glyph = buffer.readUInt16BE(at);
          if (glyph) glyph = (glyph + delta) & 0xffff;
        }
        if (!cmap.has(c)) cmap.set(c, glyph);
      }
    }
  }

  /** Contours of a glyph in font units (y up), as arrays of on-curve-resolved points. */
  function outline(glyph) {
    if (glyph >= numGlyphs) return [];
    const start = tables.glyf + glyphOffset(glyph);
    if (glyphOffset(glyph + 1) === glyphOffset(glyph)) return []; // empty (space)
    const contours = buffer.readInt16BE(start);
    if (contours < 0) return composite(start + 10);

    const endPts = [];
    for (let i = 0; i < contours; i++) endPts.push(buffer.readUInt16BE(start + 10 + i * 2));
    const points = endPts.at(-1) + 1;
    let at = start + 10 + contours * 2;
    at += 2 + buffer.readUInt16BE(at); // skip instructions
    const flags = [];
    while (flags.length < points) {
      const flag = buffer[at++];
      flags.push(flag);
      if (flag & 8) {
        const repeat = buffer[at++];
        for (let r = 0; r < repeat; r++) flags.push(flag);
      }
    }
    const read = (short, same) => {
      const xs = [];
      let value = 0;
      for (const flag of flags) {
        if (flag & short) {
          const d = buffer[at++];
          value += flag & same ? d : -d;
        } else if (!(flag & same)) {
          value += buffer.readInt16BE(at);
          at += 2;
        }
        xs.push(value);
      }
      return xs;
    };
    const xs = read(2, 16);
    const ys = read(4, 32);

    const result = [];
    let first = 0;
    for (const last of endPts) {
      const pts = [];
      for (let p = first; p <= last; p++) pts.push({ x: xs[p], y: ys[p], on: Boolean(flags[p] & 1) });
      first = last + 1;
      result.push(flatten(pts));
    }
    return result;
  }

  function composite(at) {
    const result = [];
    for (;;) {
      const flags = buffer.readUInt16BE(at);
      const glyph = buffer.readUInt16BE(at + 2);
      at += 4;
      let dx;
      let dy;
      if (flags & 1) {
        dx = buffer.readInt16BE(at);
        dy = buffer.readInt16BE(at + 2);
        at += 4;
      } else {
        dx = buffer.readInt8(at);
        dy = buffer.readInt8(at + 1);
        at += 2;
      }
      let [a, b, c, d] = [1, 0, 0, 1];
      const f2dot14 = (o) => buffer.readInt16BE(o) / 16384;
      if (flags & 8) {
        a = d = f2dot14(at);
        at += 2;
      } else if (flags & 0x40) {
        a = f2dot14(at);
        d = f2dot14(at + 2);
        at += 4;
      } else if (flags & 0x80) {
        [a, b, c, d] = [f2dot14(at), f2dot14(at + 2), f2dot14(at + 4), f2dot14(at + 6)];
        at += 8;
      }
      for (const contour of outline(glyph)) {
        result.push(contour.map(([x, y]) => [a * x + c * y + dx, b * x + d * y + dy]));
      }
      if (!(flags & 0x20)) break;
    }
    return result;
  }

  /** TrueType quadratic contour → polygon. */
  function flatten(pts) {
    if (!pts.length) return [];
    // Start on an on-curve point (or the midpoint of two off-curve ones).
    let startIndex = pts.findIndex((p) => p.on);
    let startPt;
    if (startIndex === -1) {
      startIndex = 0;
      startPt = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    } else startPt = pts[startIndex];
    const out = [[startPt.x, startPt.y]];
    let prev = [startPt.x, startPt.y];
    let control = null;
    for (let k = 1; k <= pts.length; k++) {
      const p = pts[(startIndex + k) % pts.length];
      const here = [p.x, p.y];
      if (p.on) {
        if (control) out.push(...quadratic(prev, control, here, 8));
        else out.push(here);
        prev = here;
        control = null;
      } else if (control) {
        const mid = [(control[0] + p.x) / 2, (control[1] + p.y) / 2];
        out.push(...quadratic(prev, control, mid, 8));
        prev = mid;
        control = here;
      } else control = here;
    }
    if (control) out.push(...quadratic(prev, control, [startPt.x, startPt.y], 8));
    return out;
  }

  const glyphFor = (char) => cmap.get(char.codePointAt(0)) ?? 0;

  /** Width of `text` in pixels at font size `size`, with optional extra tracking (em fraction). */
  function measure(text, size, tracking = 0) {
    let units = 0;
    for (const char of text) units += advance(glyphFor(char)) + tracking * unitsPerEm;
    return (units * size) / unitsPerEm;
  }

  /**
   * Polygons (pixel space, y down) for `text` with its baseline at (x, y).
   * `skew` slants glyphs to the right (tan of the angle).
   */
  function layout(text, size, x, y, { tracking = 0, skew = 0 } = {}) {
    const scale = size / unitsPerEm;
    const polygons = [];
    let pen = x;
    for (const char of text) {
      const glyph = glyphFor(char);
      for (const contour of outline(glyph)) {
        polygons.push(contour.map(([gx, gy]) => [pen + (gx + gy * skew) * scale, y - gy * scale]));
      }
      pen += (advance(glyph) + tracking * unitsPerEm) * scale;
    }
    return polygons;
  }

  /** Whether the font has a glyph for a character; one it lacks is drawn as an empty box. */
  const has = (char) => cmap.has(char.codePointAt(0));

  return { unitsPerEm, ascent, has, measure, layout };
}
