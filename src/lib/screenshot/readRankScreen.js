/**
 * Reads a rank screen: finds the rank, the rank progress and the "higher
 * ranked than" percentage in a screenshot, on the visitor's own computer.
 *
 * It looks twice. A first pass over the whole screen finds where the three
 * lines are. Each is then cut out, enlarged, turned into dark text on a
 * light background and read again on its own, and each number a third time
 * with only digits allowed. A number is taken when the readings agree; when
 * they do not, the closest look is kept and the field is marked unsure.
 *
 * It also notes the role the rank is held in ("TANK", written over the
 * rank's emblem). Nobody is shown that or asked to check it, so it is
 * simply left out when it cannot be read.
 */
import { findRole, parseRankScreen, readBetterThan, readNumber, readProgress, readRank, settle } from './parse.js';
import { recognise, stopRecognising, warmUp } from './ocr.js';

/** Starts the text reader before there is anything to read, so the first screenshot does not wait for it. */
export const prepareToRead = warmUp;
/** Shuts the text reader down and frees its memory, e.g. when the page that used it is left. */
export const stopReading = stopRecognising;

/** The screenshot is worked on with its longer side this many pixels long; the cut-outs are taken from it at this size. */
const SCREEN_EDGE = 2400;
/** Never enlarged by more than this: beyond it there is nothing more to see. */
const MAX_ENLARGE = 2;
/**
 * The ways the whole screen is read, in turn, until all three lines are
 * found: the length of its longer side, and how the recogniser is told the
 * text is laid out. Which lines it notices depends on both, and no one way
 * finds everything every time. Read as a page at a modest size finds the
 * most; read as scattered text at full size is surest of the rank.
 */
const LOOKS = [
  { edge: 1500, layout: 'page' },
  { edge: SCREEN_EDGE, layout: 'scattered' },
  { edge: SCREEN_EDGE, layout: 'page' },
];
const FIELDS = ['rank', 'progress', 'betterThan'];
/** The "higher ranked than" line sits level with "rank progress". This is how much of the screen above and below that line is searched for it, in line heights. */
const BAND = 1.2;
/** Height (px) a cut-out line is enlarged to. */
const LINE_HEIGHT = 96;
/**
 * Where the role is looked for when the first pass walked past it: boxes
 * measured from the top of the rank's line and its middle, in screen
 * heights (the game lays this screen out by the height of the window).
 * `up` is how far above the rank a box starts and ends, `across` how far it
 * reaches to each side, `height` the height (px) it is enlarged to.
 *
 * The first is a close cut around where the role is written, just over the
 * emblem. The second is everything above the rank, for a screenshot that
 * was cropped or is laid out differently.
 */
const ROLE_LOOKS = [
  { up: [0.51, 0.4], across: 0.2, height: 300, layout: 'block', filter: true },
  { up: [Infinity, 0], across: 0.45, height: 0, layout: 'scattered', filter: false },
];
/** Margin (px) kept around a cut-out, so letters are not touching its edge. */
const MARGIN = 14;

/** Draws an image (a bitmap or another canvas) with its longer side `edge` pixels long. */
function resized(image, edge, limit = Infinity) {
  const scale = Math.min(limit, edge / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Lines read off a resized copy or a strip of the screen, with their boxes
 * put back in the screen's own pixels: scaled by `factor`, then moved down
 * by `top`.
 */
function inScreenPixels(lines, factor, top = 0) {
  const box = ({ x0, y0, x1, y1 }) => ({ x0: x0 * factor, y0: top + y0 * factor, x1: x1 * factor, y1: top + y1 * factor });
  return lines.map((line) => ({
    ...line,
    bbox: box(line.bbox),
    words: line.words.map((word) => ({ ...word, bbox: box(word.bbox) })),
  }));
}

/** Light-on-dark game text as dark on light, which reads better. Browsers without canvas filters leave it as it is. */
const AS_PRINT = 'grayscale(1) invert(1) contrast(1.5)';

/** Looks for the "higher ranked than" line in the strip of screen level with the rank progress line. */
async function searchBand(screen, progressLine, ladder) {
  const { y0, y1 } = progressLine.bbox;
  const lineHeight = y1 - y0;
  const top = Math.max(0, y0 - lineHeight * BAND);
  const height = Math.min(screen.height - top, lineHeight * (1 + 2 * BAND));
  const scale = Math.max(1, Math.min(3, LINE_HEIGHT / lineHeight));

  const strip = document.createElement('canvas');
  strip.width = Math.round(screen.width * scale);
  strip.height = Math.round(height * scale);
  const ctx = strip.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = AS_PRINT;
  ctx.drawImage(screen, 0, top, screen.width, height, 0, 0, strip.width, strip.height);

  const lines = inScreenPixels(await recognise(strip), 1 / scale, top);
  return parseRankScreen(lines, ladder).betterThan;
}

/**
 * The first pass: where the rank, the progress and the "higher ranked than"
 * lines are, and what they seem to say. `lines` is every line it read on
 * the way, for the role to be looked for among them.
 */
async function locate(screen, ladder) {
  const found = { rank: null, progress: null, betterThan: null, lines: [] };
  const complete = () => FIELDS.every((field) => found[field]);

  for (const { edge, layout } of LOOKS) {
    const view = edge === SCREEN_EDGE ? screen : resized(screen, edge);
    const lines = inScreenPixels(await recognise(view, { layout }), screen.width / view.width);
    found.lines.push(...lines);
    const seen = parseRankScreen(lines, ladder);
    for (const field of FIELDS) found[field] ??= seen[field];
    if (complete()) return found;

    if (found.progress && !found.betterThan) {
      found.betterThan = await searchBand(screen, found.progress.line, ladder);
      if (complete()) return found;
    }
  }
  return found;
}

/**
 * The role, from the lines the first pass read. If it is not among them,
 * the screen over the rank is read again, a close cut first and then all
 * of it. Without a rank there is nothing to measure from, so the role is
 * only taken when it is the one role named anywhere on the screen.
 */
async function role(screen, first) {
  const rankLine = first.rank?.line;
  const seen = findRole(first.lines, rankLine);
  if (seen || !rankLine) return seen;

  const { x0, x1, y0 } = rankLine.bbox;
  const middle = (x0 + x1) / 2;
  for (const { up, across, height, layout, filter } of ROLE_LOOKS) {
    const left = Math.max(0, middle - across * screen.height);
    const top = Math.max(0, y0 - up[0] * screen.height);
    const cutWidth = Math.min(screen.width, middle + across * screen.height) - left;
    const cutHeight = y0 - up[1] * screen.height - top;
    if (cutWidth < 1 || cutHeight < 1) continue;
    const scale = Math.max(1, Math.min(3, height / cutHeight));

    const cut = document.createElement('canvas');
    cut.width = Math.round(cutWidth * scale);
    cut.height = Math.round(cutHeight * scale);
    const ctx = cut.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    if (filter) ctx.filter = AS_PRINT;
    ctx.drawImage(screen, left, top, cutWidth, cutHeight, 0, 0, cut.width, cut.height);

    try {
      const found = findRole(await recognise(cut, { layout }));
      if (found) return found;
    } catch {
      // Not worth failing the whole reading over.
      return null;
    }
  }
  return null;
}

/** Cuts a box out of the screen, enlarged, as dark text on a light background. */
function cutOut(screen, { x0, y0, x1, y1 }) {
  const left = Math.max(0, x0 - MARGIN);
  const top = Math.max(0, y0 - MARGIN);
  const width = Math.min(screen.width, x1 + MARGIN) - left;
  const height = Math.min(screen.height, y1 + MARGIN) - top;
  const scale = Math.max(1, Math.min(4, LINE_HEIGHT / height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = AS_PRINT;
  ctx.drawImage(screen, left, top, width, height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const textOf = (lines) => lines.map((line) => line.text).join(' ');

/** Reads one cut-out line again and pulls a value out of it with `read`. */
async function reread(screen, bbox, read, options) {
  try {
    return read(textOf(await recognise(cutOut(screen, bbox), { layout: 'line', ...options })));
  } catch {
    return null;
  }
}

/** A number, from the readings of it in order of trust: its line on its own, the figure alone, the first pass. */
async function number(screen, found, read) {
  if (!found) return null;
  const alone = found.word ? await reread(screen, found.word.bbox, readNumber, { only: '0123456789.,%' }) : null;
  const again = await reread(screen, found.line.bbox, read);
  return settle([again, alone, found.value]);
}

/**
 * @param {Blob} file the screenshot as chosen, before it is shrunk for upload
 * @param ladder the ladder of the season it is for: only its ranks are looked for
 * @returns {Promise<{
 *   tier: object | null, number: number | null,
 *   progress: number | null, betterThan: number | null,
 *   role: string | null,
 *   unsure: ('rank' | 'progress' | 'betterThan')[]
 * }>} what could be read; `role` is a role id from src/data/roles.js;
 *     `unsure` lists the fields whose readings disagreed
 */
export async function readRankScreen(file, ladder) {
  const bitmap = await createImageBitmap(file);
  const screen = resized(bitmap, SCREEN_EDGE, MAX_ENLARGE);
  bitmap.close();
  const first = await locate(screen, ladder);

  // The rank: the first pass and a closer look, whichever misread fewer letters.
  let rank = first.rank;
  let rankDisputed = false;
  if (rank) {
    const again = await reread(screen, rank.line.bbox, (text) => readRank(text, ladder));
    rankDisputed = Boolean(again) && (again.tier.id !== rank.tier.id || again.number !== rank.number);
    if (again && again.off < rank.off) rank = again;
  }
  const progress = await number(screen, first.progress, readProgress);
  const betterThan = await number(screen, first.betterThan, readBetterThan);
  const heldIn = await role(screen, first);

  const unsure = [];
  if (rankDisputed) unsure.push('rank');
  if (progress && !progress.agreed) unsure.push('progress');
  if (betterThan && !betterThan.agreed) unsure.push('betterThan');

  return {
    tier: rank?.tier ?? null,
    number: rank?.number ?? null,
    progress: progress?.value ?? null,
    betterThan: betterThan?.value ?? null,
    role: heldIn,
    unsure,
  };
}
