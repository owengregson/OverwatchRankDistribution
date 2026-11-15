import { clamp } from '../math/util.js';

/**
 * Maps data to pixels for a plot of `width` × `height` with `padding` around
 * the drawing area. x is SR (0…maxSr), y is density (0…maxDensity).
 */
export function createScales({ width, height, padding, maxSr, maxDensity }) {
  const innerW = Math.max(1, width - padding.left - padding.right);
  const innerH = Math.max(1, height - padding.top - padding.bottom);
  const left = padding.left;
  const top = padding.top;
  const bottom = top + innerH;

  return {
    width,
    height,
    padding,
    innerW,
    innerH,
    left,
    right: left + innerW,
    top,
    bottom,
    x: (sr) => left + (sr / maxSr) * innerW,
    y: (density) => bottom - (density / maxDensity) * innerH,
    /** SR under a pixel x-coordinate, clamped to the axis. */
    srAt: (px) => clamp(((px - left) / innerW) * maxSr, 0, maxSr),
    /** Width in pixels of an SR span. */
    span: (sr) => (sr / maxSr) * innerW,
  };
}

/** Evenly spaced SR values from 0 to maxSr inclusive. */
export function sampleSrs(maxSr, step) {
  const srs = [];
  for (let sr = 0; sr <= maxSr; sr += step) srs.push(sr);
  return srs;
}

/** Linear interpolation of evenly sampled values at an arbitrary SR. */
export function interpolate(srs, values, sr) {
  const step = srs[1] - srs[0];
  const position = clamp((sr - srs[0]) / step, 0, srs.length - 1);
  const i = Math.min(Math.floor(position), srs.length - 2);
  return values[i] + (values[i + 1] - values[i]) * (position - i);
}
