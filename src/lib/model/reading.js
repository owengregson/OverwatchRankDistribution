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

/**
 * The gap between two readings, ordered so `low` is the lower SR, and what
 * that gap amounts to:
 *
 *   rarity     how many times rarer the higher rank is: the share of players
 *              at or above `low`, over the share at or above `high`
 *   passed     of everyone ranked above `low`, the share that `high` has
 *              also got past (0 to 1)
 *   crowding   how many players the stretch holds for its length, against
 *              the ladder as a whole: 1 is the average, more is a crowded
 *              stretch (the middle of the curve), less a thin one (the ends)
 *
 * Each is null where it cannot be said: no gap, or nobody above.
 */
export function compareReadings(a, b, ladder) {
  const [low, high] = a.sr <= b.sr ? [a, b] : [b, a];
  const srGap = high.sr - low.sr;
  const playersBetween = high.betterThan - low.betterThan;
  const apart = srGap > 0 && playersBetween > 0;
  return {
    low,
    high,
    srGap,
    playersBetween,
    divisionGap: high.division.index - low.division.index,
    rarity: apart && high.top > 0 ? low.top / high.top : null,
    passed: apart && low.top > 0 ? playersBetween / low.top : null,
    crowding: apart ? (playersBetween / srGap) * (ladder.maxSr - ladder.minSr) : null,
  };
}

/** Share of all players in each tier, in ladder order. */
export function tierShares(model, ladder) {
  return ladder.tiers.map((tier) => ({
    tier,
    share: model.cdf(tier.maxSr) - model.cdf(tier.minSr),
  }));
}
