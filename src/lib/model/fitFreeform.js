import { cdf as phi, pdf as density, probit } from '../math/normal.js';
import { clamp } from '../math/util.js';
import { monotoneCurve } from '../math/monotone.js';

/**
 * Fits a curve of any shape: one that passes through every datapoint.
 *
 * It works in the same "probit space" as the bell-curve fit. There a bell
 * curve is a straight line, z = (sr − mean) / sd. This model draws a smooth,
 * always-rising curve z(sr) through the datapoints instead, so:
 *
 *   - with two datapoints it is that straight line: the same bell curve;
 *   - with datapoints across the ladder it takes whatever shape they
 *     describe (lopsided, flat-topped, heavy-tailed) and is bell-shaped in
 *     between them;
 *   - past the outermost datapoints it carries straight on, as a bell
 *     curve's tail would.
 *
 * SR stops at `minSr` and `maxSr`, but those tails do not. Players the curve
 * puts past an end of the scale are not dropped: they are counted where the
 * game puts them, in the division at that end, which is what makes the
 * lowest division of a real distribution stand taller than the one above
 * it. They are spread over that division (`floorWidth`, `ceilingWidth`),
 * thickest at the very end.
 *
 * Datapoints at the same SR are averaged by weight. Datapoints that
 * contradict each other (a higher SR, a smaller share of players) are
 * averaged into one point between them. Otherwise weights have no effect:
 * the curve goes through each point however little it is trusted.
 *
 * @param {{ sr: number, p: number, weight: number }[]} points sorted by SR
 * @param {{ minSr: number, maxSr: number, floorWidth: number, ceilingWidth: number }} range
 */
export function fitFreeform(points, { minSr, maxSr, floorWidth, ceilingWidth }) {
  if (points.length < 2 || points.every((pt) => pt.sr === points[0].sr)) {
    throw new Error('A curve needs at least two datapoints at different SR values.');
  }

  const knots = risingKnots(points);
  if (knots.length < 2) {
    throw new Error('Datapoints disagree: a higher SR must be better than a larger share of players.');
  }

  const first = knots[0];
  const last = knots.at(-1);
  const curve = monotoneCurve(
    knots.map((knot) => knot.sr),
    knots.map((knot) => knot.z),
  );
  /** Share of players below `sr` if SR had no limits. */
  const unbounded = (sr) => phi(curve.at(sr));

  // What the tails hold beyond each end of the scale, and the stretch of
  // ladder it is counted in: the end division, or less when a datapoint
  // inside that division says how much of it is below that point.
  const floor = pile(unbounded(minSr), Math.min(floorWidth, first.sr - minSr), floorWidth);
  const ceiling = pile(1 - unbounded(maxSr), Math.min(ceilingWidth, maxSr - last.sr), ceilingWidth);

  const cdf = (sr) => {
    if (sr <= minSr) return 0;
    if (sr >= maxSr) return 1;
    return clamp(unbounded(sr) - floor.beyond(sr - minSr) + ceiling.beyond(maxSr - sr), 0, 1);
  };

  const pdf = (sr) => {
    if (sr < minSr || sr > maxSr) return 0;
    return density(curve.at(sr)) * curve.slopeAt(sr) + floor.density(sr - minSr) + ceiling.density(maxSr - sr);
  };

  /** The curve has no formula to run backwards, so the SR is closed in on by halving. */
  const quantile = (p) => {
    if (!(p > 0)) return minSr;
    if (p >= 1) return maxSr;
    let low = minSr;
    let high = maxSr;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (cdf(mid) < p) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  };

  return {
    type: 'freeform',
    params: { knots, floorShare: floor.mass, ceilingShare: ceiling.mass },
    minSr,
    maxSr,
    cdf,
    pdf,
    quantile,
  };
}

/**
 * The datapoints as points for the curve to pass through, in probit space:
 * one per SR, each higher than the last. Neighbours that are out of order
 * are pooled into their weighted average, in SR as well as in z, and pooled
 * again until every point is above the one before it.
 */
function risingKnots(points) {
  const knots = [];
  for (const { sr, p, weight } of points) {
    let knot = { sr, z: probit(p), weight };
    while (knots.length && (knots.at(-1).sr === knot.sr || knots.at(-1).z >= knot.z)) {
      const last = knots.pop();
      const total = last.weight + knot.weight;
      knot = {
        sr: (last.sr * last.weight + knot.sr * knot.weight) / total,
        z: (last.z * last.weight + knot.z * knot.weight) / total,
        weight: total,
      };
    }
    knots.push(knot);
  }
  return knots.map(({ sr, z }) => ({ sr, z }));
}

/**
 * A share of players (`mass`) stacked against one end of the scale over
 * `width` SR: densest at the end, fading smoothly to nothing at `width`.
 * Distances are measured inwards from that end.
 */
function pile(mass, width, endDivisionWidth) {
  // A datapoint on the very end of the scale leaves no room; keep a sliver so the stack stays finite.
  const reach = Math.max(width, endDivisionWidth / 10);
  return {
    mass,
    /** Share of all players in the part of the stack further in than `distance`. */
    beyond: (distance) => {
      if (distance >= reach) return 0;
      const u = distance / reach;
      return mass * (1 - u - Math.sin(Math.PI * u) / Math.PI);
    },
    density: (distance) => (distance >= reach ? 0 : (mass / reach) * (1 + Math.cos((Math.PI * distance) / reach))),
  };
}
