/**
 * Draws the README's pictures into docs/readme/, from the same ladder,
 * seasons, fitted curves, fonts, rank icons and logo the site uses, with no
 * dependencies. Nothing in them is typed in: the shares and the curves are
 * the bundled seasons'. Run again after the data or the look changes:
 *
 *   npm run images
 *
 *   banner.png      the logo, the title and the newest season's curve
 *   features.png    what the site does, as four cards
 *   tiers.png       the share of players in each rank, newest season
 *   seasons.png     every bundled season's curve, with its datapoints marked
 *   section-*.png   the heading strip above each section
 *
 * All are drawn twice the size they are shown at, so they stay sharp on a
 * dense screen. The README shows them at the width of its column.
 */
import { readFileSync } from 'node:fs';
import { createIconSizing } from '../src/lib/ladder/iconSizing.js';
import { createCanvas, drawLogo, hex } from './lib/raster.mjs';
import {
  ICE_300,
  ICE_400,
  LEAN,
  LINE,
  NAVY_BOTTOM,
  ORANGE,
  WHITE,
  backdrop,
  chamfered,
  drawImage,
  mix,
  oblique,
  panel,
  readImage,
  rect,
  root,
  seasonCurve,
  text,
  titling,
  write,
} from './lib/scene.mjs';
import { loadSiteData } from './site/data.js';

/** Width of every picture, in pixels: twice the README's column. */
const W = 1896;
/** Margin at the sides of the full-width pictures. */
const EDGE = 96;
const OUT = 'docs/readme';

const site = loadSiteData();
const { ladder, season } = site;

const sizing = createIconSizing(ladder, JSON.parse(readFileSync(root('src/data/iconMetrics.json'), 'utf8')));
const icons = new Map(ladder.tiers.map((tier) => [tier.id, readImage(tier.icon)]));

/**
 * A tier's icon, centred on `cx` with its foot on `bottom`. `box` is the
 * width given to the widest icon; each is sized as on the site, so that all
 * of them look the same size.
 */
function rankIcon(canvas, tier, cx, bottom, box) {
  const unit = box / sizing.box.width;
  const { width, height } = sizing.icon(tier);
  drawImage(canvas, icons.get(tier.id), cx - (width * unit) / 2, bottom - height * unit, width * unit);
}

/** What a season's `model` field is called in the pictures. */
const FIT_NAMES = { normal: 'BELL CURVE', freeform: 'FOLLOWS THE DATA' };

/** The title, the logo and the newest season's curve over the rank icons. */
function banner() {
  const canvas = createCanvas(W, 600);
  backdrop(canvas);

  // The logo stands on its own above the title, with no caption beside it.
  drawLogo(canvas, EDGE, 76, 104);

  text(canvas, oblique, 'OVERWATCH', 132, EDGE, 322, WHITE, { skew: LEAN, tracking: 0.02 });
  text(canvas, oblique, 'RANK DISTRIBUTION', 132, EDGE, 438, ORANGE, { skew: LEAN, tracking: 0.02 });
  text(canvas, titling, 'WHERE DO YOU STAND?', 40, EDGE + 4, 504, ICE_300, { tracking: 0.08 });

  const curve = { left: 950, right: W - EDGE, base: 400, height: 280 };
  const { xAt } = seasonCurve(canvas, site, { ...curve, labels: false, scale: 1.5 });
  for (const tier of ladder.tiers) rankIcon(canvas, tier, xAt(tier.midSr), 516, 84);
  return canvas;
}

/** A heading strip: a slanted orange block with the section's number, its name, and a few words on the right. */
function section(index, title, note) {
  const height = 112;
  const canvas = createCanvas(W, height);
  panel(canvas, 0, 0, W, height, 28);

  const lean = 26;
  canvas.fill([[[28 + lean, 0], [176 + lean, 0], [176, height], [28, height]].map(([x, y]) => [x, y])], ORANGE);
  text(canvas, oblique, String(index).padStart(2, '0'), 68, 115, 80, WHITE, { skew: LEAN, align: 'center' });

  text(canvas, oblique, title, 68, 236, 80, WHITE, { skew: LEAN, tracking: 0.02 });
  text(canvas, titling, note, 30, W - 64, 68, ICE_400, { tracking: 0.14, align: 'right' });
  return canvas;
}

/** What the site does: four of its step cards, an orange number over a name and a line. */
function features() {
  const cards = [
    ['EXPLORE', ['EVERY RANK,', 'EVERY PERCENTILE']],
    ['FIND', ['LOOK UP ANY SR,', 'PERCENT OR RANK']],
    ['COMPARE', ['PIN TWO RANKS,', 'MEASURE THE GAP']],
    ['SUBMIT', ['SEND A SCREENSHOT,', 'SHARPEN THE CURVE']],
  ];
  const gap = 24;
  const width = (W - gap * (cards.length - 1)) / cards.length;
  const height = 292;
  const canvas = createCanvas(W, height);

  cards.forEach(([title, lines], i) => {
    const x = i * (width + gap);
    panel(canvas, x, 0, width, height, 26);
    // The accent bar along the top of a panel, past its cut corner.
    canvas.fill([rect(x + 26, 0, x + width * 0.55, 5)], ORANGE, 1, (px) =>
      mix(ORANGE, hex('#1c2a5c'), Math.min(1, (px - x - 26) / (width * 0.55 - 26))),
    );
    text(canvas, titling, String(i + 1), 150, x + 40, 148, ORANGE);
    text(canvas, oblique, title, 76, x + 132, 136, WHITE, { skew: LEAN, tracking: 0.02 });
    lines.forEach((line, row) => {
      text(canvas, titling, line, 32, x + 40, 208 + row * 40, ICE_300, { tracking: 0.07 });
    });
  });
  return canvas;
}

/** The share of players in each rank for the newest season: a bar, its figure and the rank's icon. */
function tiers() {
  const canvas = createCanvas(W, 620);
  backdrop(canvas);

  text(canvas, oblique, 'SHARE OF PLAYERS BY RANK', 64, EDGE, 104, WHITE, { skew: LEAN, tracking: 0.02 });
  text(canvas, titling, `${season.name.toUpperCase()} · ${FIT_NAMES[season.model.type]}`, 30, W - EDGE, 100, ICE_400, {
    tracking: 0.14,
    align: 'right',
  });

  const base = 420;
  const tallest = 230;
  const column = (W - EDGE * 2) / site.tiers.length;
  const most = Math.max(...site.tiers.map((tier) => tier.share));
  canvas.fill([rect(EDGE, base, W - EDGE, base + 2)], LINE, 0.3);

  site.tiers.forEach((tier, i) => {
    const cx = EDGE + column * (i + 0.5);
    const color = hex(tier.color);
    const top = base - Math.max(4, (tier.share / most) * tallest);
    const half = column * 0.3;
    // Slanted at the top, like the game's bars; the shortest bars barely, so they stay above the line.
    const slant = Math.min(14, (base - top) * 0.4);
    canvas.fill([[[cx - half, top + slant], [cx + half, top], [cx + half, base], [cx - half, base]]], color, 1, (_, py) =>
      mix(color, NAVY_BOTTOM, Math.min(0.6, Math.max(0, (py - top) / (tallest * 1.4)))),
    );
    text(canvas, titling, site.pct(tier.share), 46, cx, top - 16, WHITE, { align: 'center' });
    rankIcon(canvas, tier, cx, base + 124, 132);
    text(canvas, titling, tier.name.toUpperCase(), 30, cx, base + 168, color, { tracking: 0.06, align: 'center' });
  });
  return canvas;
}

/** Every bundled season's curve on its own ladder, in rows of four, with a dot at each of its datapoints. */
function seasons() {
  const perRow = Math.min(4, site.seasons.length);
  const rows = Math.ceil(site.seasons.length / perRow);
  const gap = 40;
  const cell = { width: (W - EDGE * 2 - gap * (perRow - 1)) / perRow, height: 364 };
  const canvas = createCanvas(W, 56 + rows * cell.height);
  backdrop(canvas);

  site.seasons.forEach((entry, i) => {
    const x = EDGE + (i % perRow) * (cell.width + gap);
    const y = 56 + Math.floor(i / perRow) * cell.height;
    const count = entry.datapoints.length;

    text(canvas, oblique, entry.name.toUpperCase(), 54, x, y + 44, WHITE, { skew: LEAN, tracking: 0.02 });
    text(canvas, titling, `${FIT_NAMES[entry.model.type]} · ${count} DATAPOINT${count === 1 ? '' : 'S'}`, 26, x + 2, y + 84, ICE_400, {
      tracking: 0.12,
    });
    seasonCurve(
      canvas,
      { ladder: entry.playedOn, model: entry.model },
      { left: x, right: x + cell.width, base: y + 320, height: 200, labels: false, dots: true, scale: 1.4 },
    );
  });
  return canvas;
}

/** The section headings, in the order the README has them: [file name, name, the words on the right]. */
const SECTIONS = [
  ['run', 'RUN IT', 'TWO COMMANDS'],
  ['curve', 'THE CURVE', 'FITTED, NEVER DRAWN'],
  ['submissions', 'SUBMISSIONS', 'READ ON YOUR DEVICE'],
  ['admin', 'ADMIN', 'REVIEW · DATAPOINTS · SEASONS'],
  ['live', 'GO LIVE', 'SUPABASE + GITHUB PAGES'],
  ['map', 'MAP', 'WHERE THINGS ARE'],
];

write(`${OUT}/banner.png`, banner());
write(`${OUT}/features.png`, features());
write(`${OUT}/tiers.png`, tiers());
write(`${OUT}/seasons.png`, seasons());
SECTIONS.forEach(([file, title, note], i) => write(`${OUT}/section-${file}.png`, section(i + 1, title, note)));
