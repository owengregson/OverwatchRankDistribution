/**
 * Weighted least-squares line through (x, y) points: y ≈ intercept + slope·x.
 * With exactly two points this is the line through both of them.
 *
 * @param {number[]} xs
 * @param {number[]} ys
 * @param {number[]} [weights] defaults to 1 for every point
 */
export function weightedLinearFit(xs, ys, weights = xs.map(() => 1)) {
  let total = 0;
  let meanX = 0;
  let meanY = 0;
  for (let i = 0; i < xs.length; i++) {
    total += weights[i];
    meanX += weights[i] * xs[i];
    meanY += weights[i] * ys[i];
  }
  meanX /= total;
  meanY /= total;

  let spreadX = 0;
  let covariance = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - meanX;
    spreadX += weights[i] * dx * dx;
    covariance += weights[i] * dx * (ys[i] - meanY);
  }
  if (spreadX === 0) {
    throw new Error('Cannot fit a line: every point has the same x value.');
  }

  const slope = covariance / spreadX;
  return { slope, intercept: meanY - slope * meanX };
}
