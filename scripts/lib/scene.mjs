/**
 * The site's look, for the scripts that draw images with ./raster.mjs: its
 * colours and fonts, the navy backdrop, a chamfered panel, a season's curve
 * filled tier by tier, and the rank icons. The social preview and app icons
 * (../make-og-image.mjs) and the README's pictures (../make-readme-images.mjs)
 * are all put together from these, so they match each other and the site.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './png.mjs';
import { hex } from './raster.mjs';
import { loadFont } from './ttf.mjs';

/** The full path of a file given relative to the project's root. */
export const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

/** The display face, upright and slanted. Both only have capitals. */
export const titling = loadFont(readFileSync(root('assets/fonts/big_noodle_titling.ttf')));
export const oblique = loadFont(readFileSync(root('assets/fonts/big_noodle_titling_oblique.ttf')));
/** How far the slanted titles lean on top of that, as in game: the tangent of 6°. */
export const LEAN = Math.tan((6 * Math.PI) / 180);

// The colours of src/styles/tokens.css.
export const NAVY_TOP = hex('#0f1a3f');
export const NAVY_BOTTOM = hex('#080e24');
export const GLOW = hex('#2c428f');
export const PANEL_TOP = hex('#1c2a5c');
export const PANEL_BOTTOM = hex('#0f1838');
export const LINE = hex('#a0b9ff');
export const ORANGE = hex('#f06414');
export const WHITE = hex('#ffffff');
export const ICE_300 = hex('#b4c0db');
export const ICE_400 = hex('#8794b6');
export const ICE_500 = hex('#5e6c93');

export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** A rectangle as a polygon. */
export const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** The site's panel shape: a box with its top-left and bottom-right corners cut off by `cut`. */
export const chamfered = (x, y, w, h, cut) => [
  [x + cut, y],
  [x + w, y],
  [x + w, y + h - cut],
  [x + w - cut, y + h],
  [x, y + h],
  [x, y + cut],
];

/** The site's backdrop: navy gradient lit from the top right. */
export function backdrop(canvas) {
  const { width, height } = canvas;
  canvas.shade((x, y) => {
    const base = mix(NAVY_TOP, NAVY_BOTTOM, y / height);
    const dx = (x - width * 0.8) / (width * 0.75);
    const dy = (y + height * 0.1) / (height * 0.9);
    const glow = Math.max(0, 1 - Math.hypot(dx, dy));
    return mix(base, GLOW, glow * glow * 0.85);
  });
}

/** One of the site's panels: a chamfered box, lighter at the top, with a hairline edge. */
export function panel(canvas, x, y, w, h, cut) {
  canvas.fill([chamfered(x, y, w, h, cut)], LINE, 0.22);
  canvas.fill([chamfered(x + 1, y + 1, w - 2, h - 2, cut)], PANEL_TOP, 1, (_, py) =>
    mix(PANEL_TOP, PANEL_BOTTOM, Math.min(1, Math.max(0, (py - y) / h))),
  );
}

/** A line of `width` px through `points`, as quads (all wound the same way). */
export function stroke(points, width) {
  const quads = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = (-(y1 - y0) / len) * (width / 2);
    const ny = ((x1 - x0) / len) * (width / 2);
    quads.push([
      [x0 + nx, y0 + ny],
      [x1 + nx, y1 + ny],
      [x1 - nx, y1 - ny],
      [x0 - nx, y0 - ny],
    ]);
  }
  return quads;
}

/** Text in `font` with its baseline at (x, y); `align` is where x is on the line: 'left', 'center' or 'right'. */
export function text(canvas, font, string, size, x, y, color, { tracking = 0, skew = 0, align = 'left', opacity = 1 } = {}) {
  const missing = [...string].find((char) => char !== ' ' && !font.has(char));
  if (missing) throw new Error(`The display font has no "${missing}" (in "${string}").`);
  const width = font.measure(string, size, tracking);
  const left = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  canvas.fill(font.layout(string, size, left, y, { tracking, skew }), color, opacity);
  return width;
}

/**
 * A season's fitted curve, filled tier by tier, over [left, right] with its
 * base at `base`: the tier strip under the axis, a faint line at each tier
 * boundary and, with `labels`, the tier names. `scale` enlarges the line
 * widths and lettering for a picture drawn larger.
 */
export function seasonCurve(canvas, { ladder, model }, { left, right, base, height, labels = true, scale = 1 }) {
  const xAt = (sr) => left + ((right - left) * sr) / ladder.maxSr;
  let peak = 0;
  for (let sr = 0; sr <= ladder.maxSr; sr += 5) peak = Math.max(peak, model.pdf(sr));
  const yAt = (sr) => base - (model.pdf(sr) / peak) * height;

  for (const tier of ladder.tiers) {
    const pts = [[xAt(tier.minSr), base]];
    for (let sr = tier.minSr; sr <= tier.maxSr; sr += 4) pts.push([xAt(sr), yAt(sr)]);
    pts.push([xAt(tier.maxSr), yAt(tier.maxSr)], [xAt(tier.maxSr), base]);
    canvas.fill([pts], hex(tier.color), 0.62);
    // Tier strip under the axis, and the boundary line.
    canvas.fill([rect(xAt(tier.minSr) + 1, base + 6 * scale, xAt(tier.maxSr) - 1, base + 14 * scale)], hex(tier.color));
    if (tier.minSr > 0) {
      const x = xAt(tier.minSr);
      canvas.fill([rect(x - 0.5 * scale, base - height - 10 * scale, x + 0.5 * scale, base)], WHITE, 0.1);
    }
    if (labels) {
      text(canvas, titling, tier.name.toUpperCase(), 22 * scale, xAt(tier.midSr), base + 40 * scale, hex(tier.color), {
        tracking: 0.04,
        align: 'center',
      });
    }
  }

  const line = [];
  for (let sr = 0; sr <= ladder.maxSr; sr += 4) line.push([xAt(sr), yAt(sr)]);
  canvas.fill(stroke(line, 3 * scale), WHITE, 0.9);
  canvas.fill([rect(left, base - scale, right, base + scale)], ICE_500, 0.8);

  return { xAt, yAt };
}

/** One of the site's images (assets/images), decoded. */
export const readImage = (name) => decodePng(readFileSync(root(`assets/images/${name}`)));

/**
 * Draws a decoded image `width` px wide with its top-left corner at (x, y),
 * averaging the source pixels under each drawn one, so a large icon drawn
 * small stays smooth.
 */
export function drawImage(canvas, image, x, y, width) {
  const ratio = image.width / width;
  const height = Math.round(image.height / ratio);
  const left = Math.round(x);
  const top = Math.round(y);
  for (let dy = 0; dy < height; dy++) {
    const sy0 = Math.floor(dy * ratio);
    const sy1 = Math.min(image.height, Math.max(sy0 + 1, Math.floor((dy + 1) * ratio)));
    for (let dx = 0; dx < Math.round(width); dx++) {
      const sx0 = Math.floor(dx * ratio);
      const sx1 = Math.min(image.width, Math.max(sx0 + 1, Math.floor((dx + 1) * ratio)));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const at = (sy * image.width + sx) * 4;
          const alpha = image.pixels[at + 3];
          r += image.pixels[at] * alpha;
          g += image.pixels[at + 1] * alpha;
          b += image.pixels[at + 2] * alpha;
          a += alpha;
        }
      }
      if (a > 0) canvas.blend(left + dx, top + dy, [r / a, g / a, b / a], a / (255 * (sx1 - sx0) * (sy1 - sy0)));
    }
  }
  return height;
}

/** Writes a canvas as a PNG at `file`, relative to the project's root. */
export function write(file, canvas) {
  mkdirSync(dirname(root(file)), { recursive: true });
  writeFileSync(root(file), encodePng({ width: canvas.width, height: canvas.height, pixels: canvas.pixels() }));
  console.log(`wrote ${file}`);
}
