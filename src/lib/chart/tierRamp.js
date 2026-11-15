import { fromOklab, mixOklab, parseHex, toOklab } from '../color.js';
import { clamp } from '../math/util.js';

/** SR either side of a tier boundary over which the two tiers' colours blend. */
const BLEND = 140;
/** SR between the colour stops handed to a gradient. */
const STOP_STEP = 25;
/** The soft ramp mixes in the colours from this far (SR) either side, nearer ones counting for more. */
const SOFT_REACH = 600;

const smoothstep = (t) => t * t * (3 - 2 * t);

/**
 * The colour of the curve at every SR: each tier's own colour through its
 * middle, easing into its neighbours' towards each boundary so the curve
 * never changes colour abruptly.
 *
 *   colorAt(sr)  the colour at one SR, as [r, g, b]
 *   stops        the whole ramp as gradient stops: { offset: 0…1, color }
 *   softStops    the same ramp with neighbouring tiers bled well into each
 *                other, for light that has spread out (the depths of the
 *                curve's fill) rather than light at its source
 */
export function createTierRamp(ladder) {
  const { tiers, maxSr } = ladder;
  const labs = tiers.map((tier) => toOklab(parseHex(tier.color)));

  function labAt(sr) {
    const value = clamp(sr, 0, maxSr);
    const tier = ladder.tierAt(value);
    const i = tier.index;

    // Within BLEND of a boundary the colour is part-way to the neighbour: half-way on the boundary itself.
    const toUpper = tier.maxSr - value;
    const toLower = value - tier.minSr;
    if (!tier.isTop && toUpper < BLEND) {
      return mixOklab(labs[i], labs[i + 1], smoothstep((BLEND - toUpper) / (2 * BLEND)));
    }
    if (i > 0 && toLower < BLEND) {
      return mixOklab(labs[i], labs[i - 1], smoothstep((BLEND - toLower) / (2 * BLEND)));
    }
    return labs[i];
  }

  /** The ramp around `sr` averaged together, weighted towards the middle. Past either end it continues in the end colour. */
  function softLabAt(sr) {
    const sum = [0, 0, 0];
    let total = 0;
    for (let offset = -SOFT_REACH; offset <= SOFT_REACH; offset += STOP_STEP) {
      const weight = 1 - Math.abs(offset) / (SOFT_REACH + STOP_STEP);
      const lab = labAt(sr + offset);
      for (let i = 0; i < 3; i++) sum[i] += lab[i] * weight;
      total += weight;
    }
    return sum.map((value) => value / total);
  }

  const stops = [];
  const softStops = [];
  for (let sr = 0; sr <= maxSr; sr += STOP_STEP) {
    stops.push({ offset: sr / maxSr, color: fromOklab(labAt(sr)) });
    softStops.push({ offset: sr / maxSr, color: fromOklab(softLabAt(sr)) });
  }

  return { colorAt: (sr) => fromOklab(labAt(sr)), stops, softStops };
}
