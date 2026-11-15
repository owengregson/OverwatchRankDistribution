import { clamp } from '../math/util.js';

const normalise = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Turns a ladder config (see `src/data/ladder.js`) into a queryable ladder:
 * flat lists of tiers and divisions with SR ranges, plus lookups by SR and by
 * rank name.
 */
export function createLadder(config) {
  const { maxSr, divisionsPerTier } = config;
  const divisions = [];

  const tiers = config.tiers.map((tierConfig, tierIndex) => {
    const tierMax = config.tiers[tierIndex + 1]?.minSr ?? maxSr;
    const tier = {
      ...tierConfig,
      index: tierIndex,
      maxSr: tierMax,
      midSr: (tierConfig.minSr + tierMax) / 2,
      isTop: tierIndex === config.tiers.length - 1,
      divisions: [],
    };
    const step = (tierMax - tier.minSr) / divisionsPerTier;

    for (let i = 0; i < divisionsPerTier; i++) {
      const number = divisionsPerTier - i; // 5 is the lowest division, 1 the highest
      const division = {
        id: `${tier.id}-${number}`,
        name: `${tier.name} ${number}`,
        tier,
        number,
        index: divisions.length,
        minSr: tier.minSr + i * step,
        maxSr: tier.minSr + (i + 1) * step,
        midSr: tier.minSr + (i + 0.5) * step,
      };
      tier.divisions.push(division);
      divisions.push(division);
    }
    return tier;
  });

  const tierByName = new Map();
  for (const tier of tiers) {
    for (const name of [tier.id, tier.name, ...(tier.aliases ?? [])]) {
      tierByName.set(normalise(name), tier);
    }
  }

  /** The division containing `sr`. An SR on a boundary belongs to the higher division. */
  function divisionAt(sr) {
    const value = clamp(sr, 0, maxSr);
    for (let i = divisions.length - 1; i >= 0; i--) {
      if (value >= divisions[i].minSr) return divisions[i];
    }
    return divisions[0];
  }

  /**
   * Looks up a division from text such as "Master 3", "masters3" or "GM 1".
   * Throws with a readable message when the text is not a known rank.
   */
  function parseRank(text) {
    const match = /^([a-z]+)([0-9]+)$/.exec(normalise(text));
    const tier = match && tierByName.get(match[1]);
    const division = tier?.divisions.find((d) => d.number === Number(match[2]));
    if (!division) {
      throw new Error(
        `Unknown rank "${text}". Use a tier name and a division from ${divisionsPerTier} to 1, e.g. "Master 3".`,
      );
    }
    return division;
  }

  /** Human-readable SR range, e.g. "3700–3799" (the very top division includes max SR). */
  function rangeLabel({ minSr, maxSr: upper }) {
    const last = upper >= maxSr ? maxSr : upper - 1;
    return `${minSr.toLocaleString('en-US')}–${last.toLocaleString('en-US')}`;
  }

  return {
    minSr: 0,
    maxSr,
    divisionsPerTier,
    tiers,
    divisions,
    divisionIcon: config.divisionIcon,
    /** Shared canvas that every tier icon is drawn against, in source pixels. */
    iconCanvas: {
      width: Math.max(...tiers.map((t) => t.icon.width)),
      height: Math.max(...tiers.map((t) => t.icon.height)),
    },
    divisionAt,
    tierAt: (sr) => divisionAt(sr).tier,
    parseRank,
    rangeLabel,
  };
}
