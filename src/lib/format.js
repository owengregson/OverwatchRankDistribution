/** 3245 → "3,245" */
export const formatSr = (sr) => Math.round(sr).toLocaleString('en-US');

/**
 * A 0–1 fraction as a percentage, with more decimals near the extremes where
 * whole numbers stop being informative (0.0553 % matters; 43.218 % does not).
 */
export function formatPercent(fraction) {
  const value = fraction * 100;
  if (value <= 0) return '0%';
  if (value >= 100) return '100%';
  if (value < 0.01) return '<0.01%';
  if (value > 99.99) return '>99.99%';
  const decimals = value < 1 || value > 99 ? 2 : 1;
  return `${value.toFixed(decimals)}%`;
}

/** 0.0312 → "1 in 32". Returns null when the fraction is too large to phrase that way. */
export function formatOneIn(fraction) {
  if (!(fraction > 0)) return null;
  const n = 1 / fraction;
  if (n < 1.5) return null;
  const rounded = n >= 1000 ? Math.round(n / 10) * 10 : n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
  return `1 in ${rounded.toLocaleString('en-US')}`;
}
