export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const lerp = (from, to, t) => from + (to - from) * t;

/** "Nice" axis ticks (1, 2, 5 × 10ⁿ steps) covering 0…max, excluding 0. */
export function niceTicks(max, targetCount = 4) {
  if (!(max > 0)) return [];
  const rough = max / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough);
  const ticks = [];
  for (let value = step; value <= max * 1.0001; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}
