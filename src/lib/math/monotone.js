/**
 * A smooth curve through points (x, y) that never turns back on itself:
 * where the points rise, so does the curve, with no overshoot between them
 * (Steffen's monotone cubic interpolation). Outside the points it carries
 * straight on at the slope of the outermost pair, so two points give a
 * straight line.
 *
 * @param {number[]} xs strictly increasing, at least two
 * @param {number[]} ys
 * @returns {{ at: (x: number) => number, slopeAt: (x: number) => number }}
 */
export function monotoneCurve(xs, ys) {
  const last = xs.length - 1;
  const widths = [];
  const secants = [];
  for (let i = 0; i < last; i++) {
    widths.push(xs[i + 1] - xs[i]);
    secants.push((ys[i + 1] - ys[i]) / widths[i]);
  }

  // The slope at each point. Inside, it is the slope of the parabola through
  // the point and its two neighbours, held back wherever that would make
  // the curve overshoot; at an end it is the slope of the end segment.
  const slopes = xs.map((_, i) => {
    if (i === 0) return secants[0];
    if (i === last) return secants[last - 1];
    const before = secants[i - 1];
    const after = secants[i];
    if (before * after <= 0) return 0;
    const parabola = (before * widths[i] + after * widths[i - 1]) / (widths[i - 1] + widths[i]);
    return Math.sign(before) * Math.min(2 * Math.abs(before), 2 * Math.abs(after), Math.abs(parabola));
  });

  /** Index of the segment containing x (binary search). */
  function segmentOf(x) {
    let low = 0;
    let high = last - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (xs[mid] <= x) low = mid;
      else high = mid - 1;
    }
    return low;
  }

  // Within a segment the curve is the cubic y = y0 + t·(m0 + t·(b + t·a)),
  // with t the distance into the segment.
  const cubic = (i) => {
    const h = widths[i];
    return {
      b: (3 * secants[i] - 2 * slopes[i] - slopes[i + 1]) / h,
      a: (slopes[i] + slopes[i + 1] - 2 * secants[i]) / (h * h),
    };
  };

  return {
    at(x) {
      if (x <= xs[0]) return ys[0] + slopes[0] * (x - xs[0]);
      if (x >= xs[last]) return ys[last] + slopes[last] * (x - xs[last]);
      const i = segmentOf(x);
      const t = x - xs[i];
      const { a, b } = cubic(i);
      return ys[i] + t * (slopes[i] + t * (b + t * a));
    },
    slopeAt(x) {
      if (x <= xs[0]) return slopes[0];
      if (x >= xs[last]) return slopes[last];
      const i = segmentOf(x);
      const t = x - xs[i];
      const { a, b } = cubic(i);
      return slopes[i] + t * (2 * b + t * 3 * a);
    },
  };
}
