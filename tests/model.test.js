import { describe, expect, it } from 'vitest';
import iconMetrics from '../src/data/iconMetrics.json';
import { LADDER_CONFIG } from '../src/data/ladder.js';
import season12 from '../src/data/seasons/2024-season-12.json';
import season17 from '../src/data/seasons/2025-season-17.json';
import season4 from '../src/data/seasons/2026-season-4.json';
import season from '../src/data/seasons/2026-season-5.json';
import { createLadder } from '../src/lib/ladder/createLadder.js';
import { createIconSizing } from '../src/lib/ladder/iconSizing.js';
import { ladderById, ladderOf } from '../src/lib/ladder/ladders.js';
import { cdf, probit } from '../src/lib/math/normal.js';
import { buildSeasonModel, tryBuildSeasonModel } from '../src/lib/model/buildSeasonModel.js';
import { compareReadings, readAt, tierShares } from '../src/lib/model/reading.js';

const ladder = createLadder(LADDER_CONFIG);

describe('normal helpers', () => {
  it('matches known values', () => {
    expect(cdf(0)).toBeCloseTo(0.5, 7);
    expect(cdf(1.959964)).toBeCloseTo(0.975, 6);
    expect(probit(0.97)).toBeCloseTo(1.880794, 5);
    expect(probit(0.98)).toBeCloseTo(2.053749, 5);
  });

  it('probit inverts cdf, including deep in the tails', () => {
    for (const z of [-4.5, -2, -0.3, 0, 1.1, 3, 4.2]) {
      expect(probit(cdf(z))).toBeCloseTo(z, 6);
    }
  });
});

describe('ladder', () => {
  it('has 9 tiers of 5 divisions covering 0–5000', () => {
    expect(ladder.tiers).toHaveLength(9);
    expect(ladder.divisions).toHaveLength(45);
    expect(ladder.divisions[0].minSr).toBe(0);
    expect(ladder.divisions.at(-1).maxSr).toBe(5000);
  });

  it('gives Bronze 200-SR divisions and every other tier 100-SR divisions', () => {
    expect(ladder.divisionAt(0).name).toBe('Bronze 5');
    expect(ladder.divisionAt(199).name).toBe('Bronze 5');
    expect(ladder.divisionAt(200).name).toBe('Bronze 4');
    expect(ladder.divisionAt(999).name).toBe('Bronze 1');
    expect(ladder.divisionAt(1000).name).toBe('Silver 5');
    expect(ladder.divisionAt(3700).name).toBe('Master 3');
    expect(ladder.divisionAt(3799).name).toBe('Master 3');
    expect(ladder.divisionAt(5000).name).toBe('Champion 1');
  });

  it('parses rank names and aliases', () => {
    expect(ladder.parseRank('Master 3').minSr).toBe(3700);
    expect(ladder.parseRank('masters 2').minSr).toBe(3800);
    expect(ladder.parseRank('GM1').minSr).toBe(4400);
    expect(() => ladder.parseRank('Mythic 1')).toThrow(/Unknown rank/);
    expect(() => ladder.parseRank('Gold 6')).toThrow(/Unknown rank/);
  });

  it('labels SR ranges the way players read them', () => {
    expect(ladder.rangeLabel(ladder.tiers[0])).toBe('0–999');
    expect(ladder.rangeLabel(ladder.parseRank('Master 3'))).toBe('3,700–3,799');
    expect(ladder.rangeLabel(ladder.parseRank('Champion 1'))).toBe('4,900–5,000');
  });
});

describe('season model', () => {
  const model = buildSeasonModel(season, ladder);

  it('passes exactly through two datapoints', () => {
    expect(model.cdf(3700)).toBeCloseTo(0.97, 9);
    expect(model.cdf(3800)).toBeCloseTo(0.98, 9);
    expect(model.rmse).toBeLessThan(1e-9);
  });

  it('is a proper distribution over the SR range', () => {
    expect(model.cdf(0)).toBe(0);
    expect(model.cdf(5000)).toBe(1);
    const total = tierShares(model, ladder).reduce((sum, { share }) => sum + share, 0);
    expect(total).toBeCloseTo(1, 9);

    // The density integrates to the CDF.
    let area = 0;
    for (let sr = 0; sr < 3700; sr += 1) area += model.pdf(sr + 0.5);
    expect(area).toBeCloseTo(0.97, 5);
  });

  it('quantile inverts cdf', () => {
    for (const p of [0.001, 0.25, 0.5, 0.97, 0.9999]) {
      expect(model.cdf(model.quantile(p))).toBeCloseTo(p, 7);
    }
    expect(model.quantile(0)).toBe(0);
    expect(model.quantile(1)).toBe(5000);
  });

  it('puts the median in Emerald for 2026 Season 5', () => {
    expect(ladder.divisionAt(model.quantile(0.5)).tier.id).toBe('emerald');
  });

  it('best-fits when there are more datapoints than parameters', () => {
    const noisy = buildSeasonModel(
      {
        datapoints: [
          { rank: 'Gold 5', betterThan: 3 },
          { rank: 'Emerald 5', betterThan: 41 },
          { rank: 'Diamond 5', betterThan: 76 },
          { rank: 'Master 3', betterThan: 97 },
          { sr: 3800, betterThan: 98.2, weight: 2 },
        ],
      },
      ladder,
    );
    expect(noisy.points).toHaveLength(5);
    expect(noisy.rmse).toBeGreaterThan(0);
    expect(noisy.rmse).toBeLessThan(0.02);
    expect(noisy.params.mean).toBeGreaterThan(2400);
    expect(noisy.params.mean).toBeLessThan(2800);
  });

  it('rejects unusable datapoints with a clear message', () => {
    const build = (datapoints, extra = {}) => () => buildSeasonModel({ datapoints, ...extra }, ladder);
    expect(build([{ rank: 'Master 3', betterThan: 97 }])).toThrow(/at least two/);
    expect(build([{ rank: 'Master 3', betterThan: 97 }, { rank: 'Master 2', betterThan: 96 }])).toThrow(/disagree/);
    expect(build([{ rank: 'Master 3', betterThan: 100 }, { rank: 'Master 2', betterThan: 98 }])).toThrow(/betterThan/);
    expect(build([{ betterThan: 50 }, { rank: 'Master 2', betterThan: 98 }])).toThrow(/exactly one/);
    expect(build(season.datapoints, { model: 'cubic' })).toThrow(/Unknown model/);
  });
});

describe('2026 Season 4', () => {
  // Its datapoints were read off a community graph of the season. These are
  // that graph's shares of players per tier, in percent, Bronze first; the
  // fitted curve should give them back.
  const GRAPH_TIER_SHARES = [4.9, 11.1, 21.2, 26.1, 20.9, 11.1, 3.7, 0.8];
  const model = buildSeasonModel(season4, ladder);

  it('reproduces the tier shares of the graph it was taken from', () => {
    const fitted = tierShares(model, ladder).map(({ share }) => share * 100);
    GRAPH_TIER_SHARES.forEach((share, i) => {
      expect(Math.abs(fitted[i] - share)).toBeLessThan(0.3);
    });
  });

  it('agrees closely with every one of its datapoints', () => {
    expect(model.points).toHaveLength(season4.datapoints.length);
    expect(model.rmse).toBeLessThan(0.005);
  });

  it('puts the median in Platinum', () => {
    expect(ladder.divisionAt(model.quantile(0.5)).tier.id).toBe('platinum');
  });
});

describe('ladders', () => {
  const classic = ladderById('classic');

  it('gives a season the ladder it names, and the current one otherwise', () => {
    expect(ladderOf(season17)).toBe(classic);
    expect(ladderOf(season).id).toBe('emerald');
    expect(ladderOf(season).tiers.map((t) => t.id)).toEqual(ladder.tiers.map((t) => t.id));
    expect(() => ladderById('ruby')).toThrow(/Unknown ladder/);
  });

  it('has no Emerald before it was added, and the tiers below Diamond start higher', () => {
    expect(classic.tiers.map((t) => t.id)).toEqual([
      'bronze',
      'silver',
      'gold',
      'platinum',
      'diamond',
      'master',
      'grandmaster',
      'champion',
    ]);
    expect(classic.divisions).toHaveLength(40);
    expect(classic.parseRank('Silver 5').minSr).toBe(1500);
    expect(classic.parseRank('Platinum 5').minSr).toBe(2500);
    expect(() => classic.parseRank('Emerald 3')).toThrow(/Unknown rank/);
  });

  it('keeps Diamond and above where they are today', () => {
    for (const rank of ['Diamond 5', 'Master 3', 'Grandmaster 1', 'Champion 5']) {
      expect(classic.parseRank(rank).minSr).toBe(ladder.parseRank(rank).minSr);
    }
    expect(classic.maxSr).toBe(ladder.maxSr);
  });
});

describe('seasons before Emerald', () => {
  const classic = ladderById('classic');
  const sharesOf = (model) => tierShares(model, classic).map(({ share }) => share * 100);

  it('gives back the official Season 17 tier shares to within about a point', () => {
    // Percent of players per tier on the official graph, Bronze first (Champion is "<0.1%").
    const OFFICIAL = [2.4, 12.6, 31.7, 34.9, 14.9, 3.2, 0.3];
    const fitted = sharesOf(buildSeasonModel(season17, ladderOf(season17)));
    OFFICIAL.forEach((share, i) => expect(Math.abs(fitted[i] - share)).toBeLessThan(1.1));
    expect(fitted[7]).toBeLessThan(0.1);
  });

  it('gives back the Season 12 tier shares through the middle of the ladder', () => {
    // Bronze to Diamond. Its top tiers hold more players than any bell curve allows, so they are not held to this.
    const PUBLISHED = [4.7, 20.2, 36.7, 26.9, 9.4];
    const fitted = sharesOf(buildSeasonModel(season12, ladderOf(season12)));
    PUBLISHED.forEach((share, i) => expect(Math.abs(fitted[i] - share)).toBeLessThan(1.7));
  });

  it('would be misread on the wrong ladder', () => {
    // On today's ladder "Silver 5" is 500 SR lower, which drags the whole curve down.
    const right = buildSeasonModel(season17, classic);
    const wrong = buildSeasonModel(season17, ladder);
    expect(right.quantile(0.5) - wrong.quantile(0.5)).toBeGreaterThan(300);
  });
});

describe('readings', () => {
  const model = buildSeasonModel(season, ladder);

  it('describes an SR', () => {
    const reading = readAt(model, ladder, 3750);
    expect(reading.division.name).toBe('Master 3');
    expect(reading.progress).toBeCloseTo(0.5);
    expect(reading.srToNext).toBe(50);
    expect(reading.next.name).toBe('Master 2');
    expect(reading.betterThan + reading.top).toBeCloseTo(1);
    expect(reading.divisionShare).toBeCloseTo(0.01, 9);
  });

  it('compares two readings regardless of order', () => {
    const gap = compareReadings(readAt(model, ladder, 3800), readAt(model, ladder, 3700));
    expect(gap.srGap).toBe(100);
    expect(gap.playersBetween).toBeCloseTo(0.01, 9);
    expect(gap.divisionGap).toBe(1);
    expect(gap.low.sr).toBe(3700);
  });
});

describe('tryBuildSeasonModel', () => {
  it('returns the model for a season that fits', () => {
    const fit = tryBuildSeasonModel(season, ladder);
    expect(fit.error).toBeNull();
    expect(fit.model.cdf(3700)).toBeCloseTo(0.97, 9);
  });

  it('reports a season with too little data instead of throwing', () => {
    const fit = tryBuildSeasonModel({ datapoints: [] }, ladder);
    expect(fit.model).toBeNull();
    expect(fit.error.message).toMatch(/at least two/);
  });
});

describe('ladder midpoints', () => {
  it('puts midSr halfway through each division and tier', () => {
    expect(ladder.parseRank('Master 3').midSr).toBe(3750);
    expect(ladder.parseRank('Bronze 5').midSr).toBe(100);
    expect(ladder.tiers[0].midSr).toBe(500);
  });
});

describe('icon sizing', () => {
  const sizing = createIconSizing(ladder, iconMetrics);
  const painted = (tier) => {
    const { width, height } = sizing.icon(tier);
    return width * height * iconMetrics[tier.icon].coverage;
  };

  it('gives every rank icon the same painted area', () => {
    const areas = ladder.tiers.map(painted);
    for (const area of areas) expect(area / areas[0]).toBeCloseTo(1, 6);
  });

  it('keeps each icon in proportion and inside the shared box', () => {
    for (const tier of ladder.tiers) {
      const icon = sizing.icon(tier);
      const file = iconMetrics[tier.icon];
      expect(icon.width / icon.height).toBeCloseTo(file.width / file.height, 6);
      expect(icon.width).toBeLessThanOrEqual(sizing.box.width);
      expect(icon.height).toBeLessThanOrEqual(sizing.box.height);
    }
  });

  it('enlarges wide, spindly emblems and has measurements for every image it needs', () => {
    const scaleOf = (id) => sizing.icon(ladder.tiers.find((tier) => tier.id === id)).scale;
    expect(scaleOf('grandmaster')).toBeGreaterThan(scaleOf('emerald'));
    expect(() => createIconSizing(ladder, {})).toThrow(/measure-icons/);
  });
});
