import { describe, expect, it } from 'vitest';
import { LADDER_CONFIG } from '../src/data/ladder.js';
import season from '../src/data/seasons/2026-season-5.json';
import { createLadder } from '../src/lib/ladder/createLadder.js';
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
