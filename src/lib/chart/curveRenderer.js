import { css, lighten, saturate } from '../color.js';

/**
 * Paints the distribution curve on a canvas, lit like a strip of glowing
 * glass: light is brightest along the curve's edge and falls away into
 * the body beneath it.
 *
 * The curve is drawn in two looks, each kept as a finished picture:
 *
 *   lit   the players the cursor's rank is better than: a white-hot core
 *         line inside a bloom of its tier colour, light spilling down into
 *         the fill, fine vertical hatching
 *   dim   the players ahead: a thin line over a faint fill
 *
 * Those pictures only change with the curve's shape or the chart's size
 * (`paint`). A frame (`compose`) is then cheap: show the lit picture left
 * of the cursor and the dim one right of it, and add the moving light on
 * top: the tier under the cursor lit up, a pool of light around the
 * cursor, the occasional sheen, and the comet that draws the curve during
 * the intro.
 *
 * All positions are CSS pixels in the chart's own coordinates. The canvas
 * itself is larger than the chart by BLEED on every side.
 */

/**
 * How far the canvas reaches past the chart on every side, so the glow
 * around the ends of the curve fades out instead of stopping at the
 * canvas's edge. The canvas must be sized and placed to match (CurveLayer).
 */
export const BLEED = 72;

/** Everything about the look that is worth tuning. Lengths are CSS pixels, alphas 0–1. */
const LOOK = {
  lit: {
    /** Opacity of the fill under the curve, from the height of the peak down to the baseline. */
    body: { top: 0.62, middle: 0.26, bottom: 0.04 },
    /** Light spilling from the edge into the fill. `lift` moves the colour towards white. */
    spill: { width: 26, blur: 24, alpha: 0.375, lift: 0.1 },
    /** Glow around the line, widest first. */
    bloom: [
      { width: 20, blur: 18, alpha: 0.41, lift: 0 },
      { width: 7, blur: 5, alpha: 0.64, lift: 0.1 },
    ],
    line: { width: 2.8, lift: 0.2 },
    core: { width: 1.2, lift: 0.8, alpha: 0.95 },
  },
  dim: {
    body: { top: 0.26, middle: 0.11, bottom: 0.02 },
    line: { width: 1.5, lift: 0, alpha: 0.6 },
  },
  /**
   * The fill is deeper and more saturated than the tier colours, so it
   * reads as coloured glass rather than haze and the bright edge stands
   * out against it. `lift` below 0 moves the colour towards black.
   */
  bodyTone: { lift: -0.3, chroma: 1.4 },
  /**
   * Just under the edge each tier keeps its own colour; deeper in, the
   * colours bleed into their neighbours' (the ramp's soft stops), the way
   * light spreads out away from its source. A band this wide along the
   * edge, blurred this much, is where the tier's own colour holds.
   */
  ownColour: { width: 70, blur: 46 },
  /**
   * Hatching: vertical hairlines through the fill, `steps` SR apart (the
   * first spacing that leaves `minGap` between lines is used). `strength`
   * is how much brighter than the fill a line on a division boundary is;
   * the lines between are `minor` times that.
   */
  hatch: { steps: [25, 50, 100, 250, 500], minGap: 6, strength: 0.24, minor: 0.45, lift: 0.35 },
  /** The tier under the cursor is lit up, under the curve only. `feather` softens the band's sides. */
  band: { alpha: 0.075, lift: 0.1, feather: 16 },
  /** Light the cursor casts on the curve around it. */
  cursor: { radius: 170, alpha: 0.28, lift: 0.3 },
  /** A slanted band of light that crosses the curve now and then. */
  sheen: { width: 260, lean: 90, alpha: 0.2 },
  /** The intro: how softly the drawn part ends, and the comet at its tip. */
  wipe: { feather: 140 },
  comet: { radius: 46, lift: 0.6 },
};

/** Glows are blurred at this fraction of full size, which is far cheaper and looks the same. */
const SOFT_SCALE = 0.5;

function createLayer() {
  const canvas = document.createElement('canvas');
  return { canvas, ctx: canvas.getContext('2d') };
}

function resize({ canvas }, width, height) {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

/** Points `ctx` at chart coordinates, drawn at `scale` canvas pixels per CSS pixel. */
function aim(ctx, scale) {
  ctx.setTransform(scale, 0, 0, scale, BLEED * scale, BLEED * scale);
}

/**
 * @param {ReturnType<import('./tierRamp.js').createTierRamp>} ramp the curve's colours along the SR axis
 */
export function createCurveRenderer(ramp) {
  const lit = createLayer();
  const dim = createLayer();
  /** Working space at full size, and at SOFT_SCALE for glows. */
  const scratch = createLayer();
  const soft = createLayer();

  /** The shape being drawn, as given to `paint`. */
  let shape = null;
  let ratio = 1;
  /** The whole canvas, bleed included, as [x, y, width, height] in chart coordinates. */
  let all = [0, 0, 0, 0];

  // Variants of the ramp (moved towards white, more saturated, soft), each worked out once.
  const variants = new Map();
  function stopsFor(lift, chroma, soft) {
    const key = `${lift}/${chroma}/${soft}`;
    if (!variants.has(key)) {
      const stops = soft ? ramp.softStops : ramp.stops;
      variants.set(
        key,
        stops.map(({ offset, color }) => ({ offset, color: css(lighten(saturate(color, chroma), lift)) })),
      );
    }
    return variants.get(key);
  }

  /**
   * The tier colours laid along the SR axis, as a fill or stroke for `ctx`.
   *   lift    moves them towards white (up to 1) or black (down to -1)
   *   chroma  scales their saturation
   *   soft    uses the ramp with neighbouring tiers bled into each other
   */
  function tierPaint(ctx, { lift = 0, chroma = 1, soft = false } = {}) {
    const gradient = ctx.createLinearGradient(shape.left, 0, shape.right, 0);
    for (const { offset, color } of stopsFor(lift, chroma, soft)) gradient.addColorStop(offset, color);
    return gradient;
  }

  /**
   * The path along the curve. Each sample is a control point and the path
   * runs through the midpoints between them, which rounds off the corners
   * a run of straight segments would have.
   */
  function traceCurve(ctx) {
    const { xs, ys } = shape;
    const last = xs.length - 1;
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < last; i++) {
      ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
    }
    ctx.lineTo(xs[last], ys[last]);
  }

  /** The curve closed down to the baseline. */
  function traceArea(ctx) {
    traceCurve(ctx);
    ctx.lineTo(shape.right, shape.bottom);
    ctx.lineTo(shape.left, shape.bottom);
    ctx.closePath();
  }

  /** Empties a layer and leaves it ready to draw on in chart coordinates. */
  function clear({ canvas, ctx }, scale) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    aim(ctx, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  /** Vertical hairlines through the fill, heavier on division boundaries. */
  function drawHatch(ctx) {
    const { left, top, bottom, pxPerSr, maxSr, boundaries } = shape;
    const { steps, minGap, strength, minor, lift } = LOOK.hatch;
    const step = steps.find((sr) => sr * pxPerSr >= minGap);
    if (!step) return;

    ctx.fillStyle = tierPaint(ctx, { lift, soft: true });
    for (let sr = step; sr < maxSr; sr += step) {
      ctx.globalAlpha = strength * (boundaries.has(sr) ? 1 : minor);
      ctx.fillRect(left + sr * pxPerSr - 0.5, top, 1, bottom - top);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Leaves a blurred copy of the curve's line in the `soft` working canvas,
   * stroked `width` wide, blurred by `blur` and filled with `paint`.
   *
   * A canvas can only blur shadows, so the stroke is drawn off the side of
   * the canvas with its shadow thrown back into view. That leaves the
   * blurred shape alone, which is then filled with the colours.
   */
  function blurCurve({ width, blur }, paint) {
    const { canvas, ctx } = soft;
    const away = canvas.width + 4 * blur + width;

    clear(soft, SOFT_SCALE);
    ctx.translate(-away / SOFT_SCALE, 0);
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 2 * blur * SOFT_SCALE;
    ctx.shadowOffsetX = away;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = width;
    ctx.beginPath();
    traceCurve(ctx);
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    aim(ctx, SOFT_SCALE);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = tierPaint(ctx, paint);
    ctx.fillRect(...all);
  }

  /**
   * The fill under the curve: each tier's own colour just under the edge,
   * the colours bleeding together deeper in, hatched, and fading out
   * towards the baseline.
   */
  function drawBody(target, { top, middle, bottom }) {
    const { ctx } = scratch;
    const tone = LOOK.bodyTone;

    // First the colour that holds along the edge, as a soft band (this uses the `soft` canvas)…
    blurCurve(LOOK.ownColour, tone);

    // …then the blended colours everywhere, with that band laid over them.
    clear(scratch, ratio);
    ctx.save();
    ctx.beginPath();
    traceArea(ctx);
    ctx.clip();
    ctx.fillStyle = tierPaint(ctx, { ...tone, soft: true });
    ctx.fillRect(...all);
    ctx.drawImage(soft.canvas, ...all);
    ctx.globalCompositeOperation = 'lighter';
    drawHatch(ctx);
    ctx.restore();

    // Keep less and less of it further down.
    const fall = ctx.createLinearGradient(0, shape.peakY, 0, shape.bottom);
    fall.addColorStop(0, `rgb(0 0 0 / ${top})`);
    fall.addColorStop(0.5, `rgb(0 0 0 / ${middle})`);
    fall.addColorStop(1, `rgb(0 0 0 / ${bottom})`);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = fall;
    ctx.fillRect(...all);

    target.drawImage(scratch.canvas, ...all);
  }

  /** Adds a glow of the curve's line to `target`, optionally only where it falls inside the fill. */
  function drawGlow(target, { width, blur, alpha, lift }, insideArea = false) {
    blurCurve({ width, blur }, { lift });

    target.save();
    if (insideArea) {
      target.beginPath();
      traceArea(target);
      target.clip();
    }
    target.globalCompositeOperation = 'lighter';
    target.globalAlpha = alpha;
    target.drawImage(soft.canvas, ...all);
    target.restore();
  }

  function drawLine(ctx, { width, lift, alpha = 1 }) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = tierPaint(ctx, { lift });
    ctx.lineWidth = width;
    ctx.beginPath();
    traceCurve(ctx);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /**
   * Redraws the lit and dim pictures. Call when the curve or the chart's
   * size changes.
   *
   * @param {object} next
   *   width, height             size of the chart
   *   left, right, top, bottom  the plot area inside it
   *   xs, ys                    the curve's samples
   *   pxPerSr, maxSr            the SR axis
   *   boundaries                Set of the SRs where a division starts, for the heavier hatch lines
   * @param {number} pixelRatio  canvas pixels per CSS pixel
   */
  function paint(next, pixelRatio) {
    shape = { ...next, peakY: Math.min(...next.ys) };
    ratio = pixelRatio;
    all = [-BLEED, -BLEED, shape.width + 2 * BLEED, shape.height + 2 * BLEED];

    const [, , width, height] = all;
    for (const layer of [lit, dim, scratch]) resize(layer, Math.round(width * ratio), Math.round(height * ratio));
    resize(soft, Math.ceil(width * SOFT_SCALE), Math.ceil(height * SOFT_SCALE));

    clear(lit, ratio);
    drawBody(lit.ctx, LOOK.lit.body);
    drawGlow(lit.ctx, LOOK.lit.spill, true);
    for (const bloom of LOOK.lit.bloom) drawGlow(lit.ctx, bloom);
    drawLine(lit.ctx, LOOK.lit.line);
    drawLine(lit.ctx, LOOK.lit.core);

    clear(dim, ratio);
    drawBody(dim.ctx, LOOK.dim.body);
    drawLine(dim.ctx, LOOK.dim.line);
  }

  /** Shows `layer` between two x positions. */
  function show(ctx, layer, from, to) {
    if (to <= from) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(from, all[1], to - from, all[3]);
    ctx.clip();
    ctx.drawImage(layer.canvas, ...all);
    ctx.restore();
  }

  /** A round pool of `color` light, brightest at its centre. */
  function pool(ctx, x, y, radius, color, alpha) {
    const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
    light.addColorStop(0, css(color, alpha));
    light.addColorStop(0.35, css(color, alpha * 0.4));
    light.addColorStop(1, css(color, 0));
    ctx.fillStyle = light;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  /** Lights up a tier's column, only where it is under the curve. */
  function lightBand(ctx, { from, to, color, strength }) {
    const { alpha, lift, feather } = LOOK.band;
    const start = from - feather / 2;
    const end = to + feather / 2;
    const side = feather / (end - start);
    const tint = lighten(color, lift);

    const light = ctx.createLinearGradient(start, 0, end, 0);
    light.addColorStop(0, css(tint, 0));
    light.addColorStop(side, css(tint, alpha * strength));
    light.addColorStop(1 - side, css(tint, alpha * strength));
    light.addColorStop(1, css(tint, 0));

    // Added as light of its own, so it shows as clearly over the dim part of the curve as over the lit part.
    ctx.save();
    ctx.beginPath();
    traceArea(ctx);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = light;
    ctx.fillRect(start, shape.top, end - start, shape.bottom - shape.top);
    ctx.restore();
  }

  /**
   * Draws one frame onto the visible canvas.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} frame
   *   splitX   lit to the left of this x, dim to the right; null for lit throughout
   *   drawnX   the curve is only drawn up to this x (the intro); null once it is all drawn
   *   bands    [{ from, to, color, strength }] tiers to light up under the curve
   *   cursor   { x, y, color, strength } the light around the cursor
   *   sheen    0…1 progress of the passing band of light, or null
   *   comet    { x, y, color, strength } the tip of the intro, or null
   */
  function compose(ctx, { splitX, drawnX, bands, cursor, sheen, comet }) {
    if (!shape) return;
    const start = all[0];
    const end = all[0] + all[2];
    const edge = drawnX ?? end;
    const split = Math.min(splitX ?? end, edge);

    aim(ctx, ratio);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(...all);
    show(ctx, lit, start, split);
    show(ctx, dim, split, edge);

    for (const band of bands) {
      if (band.strength > 0) lightBand(ctx, band);
    }

    // Moving light only lands on what is already drawn: it brightens the curve, never the space around it.
    ctx.globalCompositeOperation = 'source-atop';
    if (cursor.strength > 0) {
      const { radius, alpha, lift } = LOOK.cursor;
      pool(ctx, cursor.x, cursor.y, radius, lighten(cursor.color, lift), alpha * cursor.strength);
    }
    if (sheen !== null) {
      const { width: band, lean, alpha } = LOOK.sheen;
      const x = shape.left - band + (shape.right - shape.left + 2 * band) * sheen;
      const light = ctx.createLinearGradient(x - band / 2, shape.bottom, x + band / 2, shape.bottom - lean);
      light.addColorStop(0, 'rgb(255 255 255 / 0)');
      light.addColorStop(0.5, `rgb(255 255 255 / ${alpha})`);
      light.addColorStop(1, 'rgb(255 255 255 / 0)');
      ctx.fillStyle = light;
      ctx.fillRect(...all);
    }

    if (drawnX !== null) {
      // The drawn part ends softly rather than at a hard edge.
      const { feather } = LOOK.wipe;
      const fade = ctx.createLinearGradient(edge - feather, 0, edge, 0);
      fade.addColorStop(0, 'rgb(0 0 0 / 0)');
      fade.addColorStop(1, 'rgb(0 0 0 / 1)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = fade;
      ctx.fillRect(edge - feather, all[1], feather, all[3]);
    }

    if (comet && comet.strength > 0) {
      const { radius, lift } = LOOK.comet;
      ctx.globalCompositeOperation = 'lighter';
      pool(ctx, comet.x, comet.y, radius, lighten(comet.color, lift), comet.strength);
      pool(ctx, comet.x, comet.y, radius * 0.22, [255, 255, 255], comet.strength);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  return { paint, compose };
}
