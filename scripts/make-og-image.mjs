/**
 * Draws the social preview (public/og-image.png, 1200×630) and the app icons
 * (public/icons/*.png) from the site's own ladder, fitted season curve, fonts
 * and logo, with no dependencies. Run again after the ladder, the newest
 * season or the look changes:
 *
 *   npm run images
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SITE } from '../site.config.js';
import { encodePng } from './lib/png.mjs';
import { createCanvas, drawLogo, hex } from './lib/raster.mjs';
import { loadFont } from './lib/ttf.mjs';
import { loadSiteData } from './site/data.js';

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const titling = loadFont(readFileSync(root('assets/fonts/big_noodle_titling.ttf')));
const oblique = loadFont(readFileSync(root('assets/fonts/big_noodle_titling_oblique.ttf')));
const { ladder, model } = loadSiteData();

const NAVY_TOP = hex('#0f1a3f');
const NAVY_BOTTOM = hex('#080e24');
const GLOW = hex('#2c428f');
const ORANGE = hex('#f06414');
const WHITE = hex('#ffffff');
const ICE_300 = hex('#b4c0db');
const ICE_500 = hex('#5e6c93');

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** The site's backdrop: navy gradient lit from the top right. */
function backdrop(canvas) {
  const { width, height } = canvas;
  canvas.shade((x, y) => {
    const base = mix(NAVY_TOP, NAVY_BOTTOM, y / height);
    const dx = (x - width * 0.8) / (width * 0.75);
    const dy = (y + height * 0.1) / (height * 0.9);
    const glow = Math.max(0, 1 - Math.hypot(dx, dy));
    return mix(base, GLOW, glow * glow * 0.85);
  });
}

/** A line of `width` px through `points`, as quads (all wound the same way). */
function stroke(points, width) {
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

/** The fitted season curve, filled tier by tier, over [left, right] with its base at `base`. */
function bellCurve(canvas, { left, right, base, height, labels = true }) {
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
    canvas.fill([[[xAt(tier.minSr) + 1, base + 6], [xAt(tier.maxSr) - 1, base + 6], [xAt(tier.maxSr) - 1, base + 14], [xAt(tier.minSr) + 1, base + 14]]], hex(tier.color));
    if (tier.minSr > 0) {
      const x = xAt(tier.minSr);
      canvas.fill([[[x - 0.5, base - height - 10], [x + 0.5, base - height - 10], [x + 0.5, base], [x - 0.5, base]]], WHITE, 0.1);
    }
    if (labels) {
      const size = 22;
      const text = tier.name.toUpperCase();
      const w = titling.measure(text, size, 0.04);
      const cx = xAt(tier.midSr);
      canvas.fill(titling.layout(text, size, cx - w / 2, base + 40, { tracking: 0.04 }), hex(tier.color));
    }
  }

  const line = [];
  for (let sr = 0; sr <= ladder.maxSr; sr += 4) line.push([xAt(sr), yAt(sr)]);
  canvas.fill(stroke(line, 3), WHITE, 0.9);
  canvas.fill([[[left, base - 1], [right, base - 1], [right, base + 1], [left, base + 1]]], ICE_500, 0.8);
}

function ogImage() {
  const canvas = createCanvas(SITE.ogImage.width, SITE.ogImage.height);
  backdrop(canvas);

  const left = 72;
  drawLogo(canvas, left, 52, 60);
  canvas.fill(titling.layout('UNOFFICIAL FAN PROJECT', 24, left + 78, 92, { tracking: 0.12 }), ICE_300);

  const skew = Math.tan((6 * Math.PI) / 180); // the page titles lean, as in game
  canvas.fill(oblique.layout('OVERWATCH', 104, left, 214, { skew, tracking: 0.02 }), WHITE);
  canvas.fill(oblique.layout('RANK DISTRIBUTION', 104, left, 306, { skew, tracking: 0.02 }), ORANGE);
  canvas.fill(
    titling.layout('WHAT PERCENT OF PLAYERS ARE IN EACH RANK', 32, left + 2, 352, { tracking: 0.05 }),
    ICE_300,
  );

  bellCurve(canvas, { left: 60, right: 1140, base: 552, height: 170, labels: true });
  return canvas;
}

/** Square app icon: chamfered navy tile with the logo. */
function icon(size) {
  const canvas = createCanvas(size, size);
  const cut = size * 0.16;
  // Lit from the top right, as on the site.
  canvas.fill(
    [[[cut, 0], [size, 0], [size, size - cut], [size - cut, size], [0, size], [0, cut]]],
    GLOW,
    1,
    (x, y) => mix(hex('#24356b'), hex('#0a1230'), Math.min(1, Math.hypot(size - x, y) / (size * 1.2))),
  );
  const logo = size * 0.62;
  drawLogo(canvas, (size - logo) / 2, (size - logo) / 2, logo);
  return canvas;
}

const write = (file, canvas) => {
  mkdirSync(fileURLToPath(new URL('.', new URL(`../${file}`, import.meta.url))), { recursive: true });
  writeFileSync(root(file), encodePng({ width: canvas.width, height: canvas.height, pixels: canvas.pixels() }));
  console.log(`wrote ${file}`);
};

write(`public/${SITE.ogImage.path}`, ogImage());
write('public/icons/icon-512.png', icon(512));
write('public/icons/icon-192.png', icon(192));
write('public/icons/apple-touch-icon.png', icon(180));
