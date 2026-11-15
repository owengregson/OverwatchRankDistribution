import { cdf as phi, pdf as density, probit } from '../math/normal.js';
import { weightedLinearFit } from '../math/regression.js';
import { clamp } from '../math/util.js';

const ITERATIONS = 12;

/**
 * Fits a bell curve (normal distribution, truncated to the SR range) to a
 * season's datapoints.
 *
 * A normal CDF is a straight line in "probit space": Φ⁻¹(p) = (sr − mean) / sd.
 * So the fit is a weighted least-squares line through (sr, Φ⁻¹(p)): exact when
 * there are two datapoints, best-fit when there are more.
 *
 * SR cannot go below `minSr` or above `maxSr`, so the curve is renormalised
 * over that range. The loop re-solves the line a few times so the truncated
 * curve (not the unbounded one) is what matches the datapoints.
 *
 * @param {{ sr: number, p: number, weight: number }[]} points
 * @param {{ minSr: number, maxSr: number }} range
 */
export function fitNormal(points, { minSr, maxSr }) {
  if (points.length < 2 || points.every((pt) => pt.sr === points[0].sr)) {
    throw new Error('A bell-curve fit needs at least two datapoints at different SR values.');
  }

  const srs = points.map((pt) => pt.sr);
  const weights = points.map((pt) => pt.weight);
  let mean = 0;
  let sd = 1;
  let below = 0; // Φ at minSr: mass the unbounded curve would put under the range
  let span = 1; //  Φ at maxSr minus Φ at minSr

  for (let i = 0; i < ITERATIONS; i++) {
    const zs = points.map((pt) => probit(below + pt.p * span));
    const { slope, intercept } = weightedLinearFit(srs, zs, weights);
    if (!(slope > 0)) {
      throw new Error('Datapoints disagree: a higher SR must be better than a larger share of players.');
    }
    sd = 1 / slope;
    mean = -intercept / slope;
    below = phi((minSr - mean) / sd);
    span = phi((maxSr - mean) / sd) - below;
  }

  return {
    type: 'normal',
    /** The bell before it is cut off at the ends of the scale. The model's own `mean` and `sd` describe the curve as drawn. */
    params: { mean, sd },
    minSr,
    maxSr,
    /** Fraction of players below `sr` (0–1). */
    cdf: (sr) => clamp((phi((sr - mean) / sd) - below) / span, 0, 1),
    /** Share of players per 1 SR at `sr`. */
    pdf: (sr) => (sr < minSr || sr > maxSr ? 0 : density((sr - mean) / sd) / (sd * span)),
    /** SR below which a fraction `p` of players sit. */
    quantile: (p) => clamp(mean + sd * probit(below + clamp(p, 0, 1) * span), minSr, maxSr),
  };
}
