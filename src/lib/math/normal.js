/**
 * Standard normal distribution helpers.
 *
 * Everything here works in z-space (mean 0, standard deviation 1); callers
 * are responsible for converting to and from SR.
 */

const SQRT_2PI = Math.sqrt(2 * Math.PI);

/**
 * Complementary error function, fractional error below 1.2e-7 everywhere
 * (Chebyshev fit from Numerical Recipes). The relative accuracy matters for
 * the far tails, where Champion-level percentiles live.
 */
export function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const poly =
    -1.26551223 +
    t * (1.00002368 +
    t * (0.37409196 +
    t * (0.09678418 +
    t * (-0.18628806 +
    t * (0.27886807 +
    t * (-1.13520398 +
    t * (1.48851587 +
    t * (-0.82215223 +
    t * 0.17087277))))))));
  const result = t * Math.exp(-z * z + poly);
  return x >= 0 ? result : 2 - result;
}

/** Φ(z): probability that a standard normal value is below z. */
export function cdf(z) {
  return 0.5 * erfc(-z / Math.SQRT2);
}

/** φ(z): standard normal density. */
export function pdf(z) {
  return Math.exp(-0.5 * z * z) / SQRT_2PI;
}

// Coefficients for Acklam's rational approximation of the inverse CDF.
const A = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
const B = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
const C = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
const D = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
const TAIL = 0.02425;

function tail(q) {
  return (
    (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
    ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
  );
}

/**
 * Φ⁻¹(p): the z-score below which a fraction `p` of the distribution lies.
 * Acklam's approximation, polished with one Halley step against `cdf` so the
 * two functions are exact inverses of each other.
 */
export function probit(p) {
  if (Number.isNaN(p)) return NaN;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  let z;
  if (p < TAIL) {
    z = tail(Math.sqrt(-2 * Math.log(p)));
  } else if (p > 1 - TAIL) {
    z = -tail(Math.sqrt(-2 * Math.log(1 - p)));
  } else {
    const q = p - 0.5;
    const r = q * q;
    z =
      ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) /
      (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1);
  }

  const error = cdf(z) - p;
  const step = error * SQRT_2PI * Math.exp(0.5 * z * z);
  return z - step / (1 + (z * step) / 2);
}
