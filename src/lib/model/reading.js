/**
 * Everything the UI wants to say about one SR value under a model:
 * the rank it falls in, the share of players below and above it, and how far
 * through its division it is.
 */
export function readAt(model, ladder, sr) {
  const division = ladder.divisionAt(sr);
  const { tier } = division;
  const betterThan = model.cdf(sr);
  const next = ladder.divisions[division.index + 1] ?? null;

  return {
    sr,
    division,
    tier,
    betterThan,
    top: 1 - betterThan,
    divisionShare: model.cdf(division.maxSr) - model.cdf(division.minSr),
    tierShare: model.cdf(tier.maxSr) - model.cdf(tier.minSr),
    progress: (sr - division.minSr) / (division.maxSr - division.minSr),
    next,
    srToNext: next ? Math.max(0, next.minSr - sr) : 0,
  };
}

/** The gap between two readings, ordered so `low` is the lower SR. */
export function compareReadings(a, b) {
  const [low, high] = a.sr <= b.sr ? [a, b] : [b, a];
  return {
    low,
    high,
    srGap: high.sr - low.sr,
    playersBetween: high.betterThan - low.betterThan,
    divisionGap: high.division.index - low.division.index,
  };
}

/** Share of all players in each tier, in ladder order. */
export function tierShares(model, ladder) {
  return ladder.tiers.map((tier) => ({
    tier,
    share: model.cdf(tier.maxSr) - model.cdf(tier.minSr),
  }));
}
