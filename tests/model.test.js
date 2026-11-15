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
import { monotoneCurve } from '../src/lib/math/monotone.js';
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

describe('free-form model', () => {
  const freeform = (datapoints, on = ladder) => buildSeasonModel({ model: 'freeform', datapoints }, on);
  const spread = [
    { rank: 'Silver 5', betterThan: 6 },
    { rank: 'Gold 5', betterThan: 20 },
    { rank: 'Emerald 5', betterThan: 70 },
    { rank: 'Diamond 5', betterThan: 82 },
    { rank: 'Master 5', betterThan: 93 },
    { rank: 'Grandmaster 5', betterThan: 99.5 },
  ];

  it('is the bell curve when there are only two datapoints', () => {
    const bell = buildSeasonModel(season, ladder);
    const free = freeform(season.datapoints);
    // Not to the last decimal: the two treat the sliver of curve past the ends of the scale differently.
    for (const sr of [500, 1500, 2600, 3700, 3800, 4600]) {
      expect(free.cdf(sr)).toBeCloseTo(bell.cdf(sr), 3);
    }
    expect(free.cdf(3700)).toBeCloseTo(0.97, 9);
    expect(free.cdf(3800)).toBeCloseTo(0.98, 9);
  });

  it('passes through every datapoint, whatever shape they make', () => {
    const model = freeform(spread);
    // No bell curve fits these: the same data misses by whole points.
    expect(model.rmse).toBeLessThan(1e-9);
    expect(buildSeasonModel({ datapoints: spread }, ladder).rmse).toBeGreaterThan(0.01);
    for (const point of model.points) expect(point.fitted).toBeCloseTo(point.p, 9);
  });

  it('is a proper distribution over the SR range', () => {
    const model = freeform(spread);
    expect(model.cdf(0)).toBe(0);
    expect(model.cdf(5000)).toBe(1);
    let last = 0;
    let area = 0;
    for (let sr = 0; sr < 5000; sr += 1) {
      const density = model.pdf(sr + 0.5);
      expect(density).toBeGreaterThanOrEqual(0);
      expect(model.cdf(sr + 1)).toBeGreaterThanOrEqual(last);
      last = model.cdf(sr + 1);
      area += density;
    }
    expect(area).toBeCloseTo(1, 5);
  });

  it('quantile inverts cdf', () => {
    const model = freeform(spread);
    for (const p of [0.001, 0.06, 0.25, 0.5, 0.97, 0.9999]) {
      expect(model.cdf(model.quantile(p))).toBeCloseTo(p, 7);
    }
    expect(model.quantile(0)).toBe(0);
    expect(model.quantile(1)).toBe(5000);
  });

  it('counts players the curve puts below the floor in the lowest division', () => {
    // 3% below Bronze 4 is more than a bell tail fits into Bronze 5: the rest stacks up against 0 SR.
    const model = freeform([
      { rank: 'Bronze 4', betterThan: 3 },
      { rank: 'Bronze 3', betterThan: 4 },
      { rank: 'Gold 5', betterThan: 30 },
      { rank: 'Diamond 5', betterThan: 90 },
    ]);
    const share = (name) => readAt(model, ladder, ladder.parseRank(name).minSr).divisionShare;
    expect(share('Bronze 5')).toBeCloseTo(0.03, 9);
    expect(share('Bronze 5')).toBeGreaterThan(share('Bronze 4') * 2);
    expect(model.params.floorShare).toBeGreaterThan(0.01);
    // Densest at the very bottom, thinning out towards the top of the division.
    expect(model.pdf(0)).toBeGreaterThan(model.pdf(100));
    expect(model.pdf(100)).toBeGreaterThan(model.pdf(199));
  });

  it('has no sudden steps: the curve is continuous from one SR to the next', () => {
    const model = freeform(season4.datapoints);
    let peak = 0;
    for (let sr = 0; sr <= 5000; sr += 1) peak = Math.max(peak, model.pdf(sr));
    for (let sr = 0; sr < 5000; sr += 1) {
      expect(Math.abs(model.pdf(sr + 1) - model.pdf(sr))).toBeLessThan(peak * 0.02);
    }
  });

  it('averages datapoints at the same SR by weight', () => {
    const model = freeform([
      { rank: 'Gold 5', betterThan: 20 },
      { rank: 'Diamond 5', betterThan: 80 },
      { rank: 'Diamond 5', betterThan: 90, weight: 3 },
      { rank: 'Grandmaster 5', betterThan: 99.5 },
    ]);
    const at = model.cdf(3000);
    expect(at).toBeGreaterThan(0.85);
    expect(at).toBeLessThan(0.9);
    expect(model.rmse).toBeGreaterThan(0);
  });

  it('passes between datapoints that contradict each other', () => {
    const model = freeform([
      { rank: 'Gold 5', betterThan: 20 },
      { rank: 'Master 3', betterThan: 97 },
      { rank: 'Master 2', betterThan: 96 },
      { rank: 'Grandmaster 5', betterThan: 99.5 },
    ]);
    expect(model.cdf(3750)).toBeGreaterThan(0.96);
    expect(model.cdf(3750)).toBeLessThan(0.97);
    expect(model.cdf(3800)).toBeGreaterThan(model.cdf(3700));
  });

  it('rejects unusable datapoints with a clear message', () => {
    expect(() => freeform([{ rank: 'Master 3', betterThan: 97 }])).toThrow(/at least two/);
    expect(() => freeform([{ rank: 'Master 3', betterThan: 97 }, { rank: 'Master 2', betterThan: 96 }])).toThrow(/disagree/);
  });
});

describe('mean and spread', () => {
  it('are measured from the curve, and match the bell they came from', () => {
    const model = buildSeasonModel(season, ladder);
    expect(model.mean).toBeCloseTo(model.params.mean, 0);
    expect(model.sd).toBeCloseTo(model.params.sd, 0);
    expect(model.label).toBe('Bell curve');
  });

  it('are there for a curve of any shape', () => {
    const model = buildSeasonModel(season4, ladder);
    expect(model.label).toBe('Follows the data');
    expect(model.mean).toBeGreaterThan(2000);
    expect(model.mean).toBeLessThan(2500);
    expect(model.sd).toBeGreaterThan(600);
    expect(model.sd).toBeLessThan(900);
  });
});

describe('2026 Season 4', () => {
  // The share of players in each division on the community graph the season
  // was taken from, in percent, Bronze 5 first. The graph stops at
  // Grandmaster and its figures add up to 99.8. The season's datapoints
  // are those figures added up from the bottom, exactly as given.
  //
  // The curve follows them up to Grandmaster 5, where the top 1% begins.
  // Above that it is a bell tail, not the graph (see HIGHEST_READING).
  const GRAPH = [
    [1.4, 0.6, 0.7, 1.0, 1.2],
    [1.5, 1.8, 2.2, 2.6, 3.0],
    [3.5, 3.9, 4.3, 4.6, 4.9],
    [5.1, 5.3, 5.3, 5.3, 5.1],
    [4.9, 4.6, 4.2, 3.8, 3.4],
    [3.0, 2.6, 2.2, 1.8, 1.5],
    [1.2, 0.9, 0.7, 0.5, 0.4],
    [0.3, 0.2, 0.1, 0.1, 0.1],
  ];
  const model = buildSeasonModel(season4, ladder);
  const shareOf = (division) => (model.cdf(division.maxSr) - model.cdf(division.minSr)) * 100;

  it('gives back every division on the graph it was taken from, up to the top 1%', () => {
    GRAPH.slice(0, -1).forEach((row, t) => {
      row.forEach((share, d) => {
        const division = ladder.tiers[t].divisions[d];
        expect(shareOf(division), division.name).toBeCloseTo(share, 6);
      });
    });
  });

  it('is a bell tail from Grandmaster 5 up, whatever the graph says there', () => {
    const top = model.points.filter((pt) => pt.sr >= 4000);
    expect(top.map((pt) => pt.counts)).toEqual([true, false, false, false, false, false]);
    expect(model.cdf(4000)).toBeCloseTo(0.99, 9);
    // The graph's Grandmaster divisions are 0.3, 0.2, 0.1, 0.1, 0.1: a bell tail thins out evenly instead.
    const shares = ladder.tiers[7].divisions.map(shareOf);
    shares.forEach((share, i) => i && expect(share).toBeLessThan(shares[i - 1]));
    expect(shares[0]).not.toBeCloseTo(0.3, 3);
    // A straight line in z, as a bell is.
    const z = (sr) => probit(model.cdf(sr));
    const step = z(4100) - z(4000);
    for (const sr of [4100, 4300, 4600]) expect(z(sr + 100) - z(sr)).toBeCloseTo(step, 6);
  });

  it('has the spike at Bronze 5 that a bell curve cannot', () => {
    const [bronze5, bronze4] = ladder.tiers[0].divisions;
    expect(shareOf(bronze5)).toBeGreaterThan(shareOf(bronze4) * 2);
    const bell = buildSeasonModel({ ...season4, model: 'normal' }, ladder);
    expect(bell.cdf(bronze5.maxSr)).toBeLessThan(bell.cdf(bronze4.maxSr) - bell.cdf(bronze5.maxSr));
  });

  it('passes through every datapoint it is fitted to', () => {
    expect(model.points).toHaveLength(season4.datapoints.length);
    expect(model.rmse).toBeLessThan(1e-9);
    for (const point of model.points.filter((pt) => pt.counts)) expect(point.fitted).toBeCloseTo(point.p, 9);
  });

  it('shares the top 1% between Grandmaster and Champion', () => {
    const [grandmaster, champion] = tierShares(model, ladder)
      .slice(-2)
      .map(({ share }) => share * 100);
    expect(grandmaster + champion).toBeCloseTo(1, 6);
    expect(champion).toBeGreaterThan(0.1);
    expect(champion).toBeLessThan(0.2);
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

  it('gives back the official Season 17 tier shares', () => {
    // Percent of players per tier on the official graph, Bronze first. They add up to 100 without
    // Champion, which the graph gives as "<0.1%": the curve takes its sliver out of Grandmaster.
    const OFFICIAL = [2.4, 12.6, 31.7, 34.9, 14.9, 3.2, 0.3];
    const fitted = sharesOf(buildSeasonModel(season17, ladderOf(season17)));
    OFFICIAL.forEach((share, i) => expect(fitted[i].toFixed(1)).toBe(share.toFixed(1)));
    expect(fitted[6] + fitted[7]).toBeCloseTo(0.3, 9);
    expect(fitted[7]).toBeGreaterThan(0);
    expect(fitted[7]).toBeLessThan(0.1);
  });

  it('gives back the Season 12 tier shares up to the top 1%, and a bell tail above', () => {
    // Bronze first, from the published cut-offs: top 95.4%, 75.2%, 38.53%, 11.6%, 2.21%, 0.28% and 0.01%.
    // A bell curve could not hold this many players in the top tiers; this curve does not have to be one.
    const PUBLISHED = [4.6, 20.2, 36.67, 26.93, 9.39, 1.93, 0.27, 0.01];
    const model = buildSeasonModel(season12, ladderOf(season12));
    const fitted = sharesOf(model);
    PUBLISHED.slice(0, 6).forEach((share, i) => expect(fitted[i]).toBeCloseTo(share, 6));
    // Grandmaster 5 is the first datapoint in the top 1%, so the Champion cut-off above it is not fitted:
    // the two top tiers share the published 0.28% as a bell tail splits it.
    expect(model.points.map((pt) => pt.counts)).toEqual([true, true, true, true, true, true, false]);
    expect(fitted[6] + fitted[7]).toBeCloseTo(0.28, 6);
    expect(fitted[7]).toBeGreaterThan(0.01);
    expect(fitted[7]).toBeLessThan(0.05);
  });

  it('keeps both of them close to a bell', () => {
    for (const s of [season12, season17]) {
      const curve = buildSeasonModel(s, ladderOf(s));
      const bell = buildSeasonModel({ ...s, model: 'normal' }, ladderOf(s));
      expect(Math.abs(curve.quantile(0.5) - bell.quantile(0.5))).toBeLessThan(60);
      expect(curve.rmse).toBeLessThan(1e-9);
    }
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
    const gap = compareReadings(readAt(model, ladder, 3800), readAt(model, ladder, 3700), ladder);
    expect(gap.srGap).toBe(100);
    expect(gap.playersBetween).toBeCloseTo(0.01, 9);
    expect(gap.divisionGap).toBe(1);
    expect(gap.low.sr).toBe(3700);
  });

  it('says what a gap amounts to', () => {
    // Master 3 beats 97% and Master 2 98%: the top 3% against the top 2%.
    const gap = compareReadings(readAt(model, ladder, 3700), readAt(model, ladder, 3800), ladder);
    expect(gap.rarity).toBeCloseTo(1.5, 9);
    // A third of the players above Master 3 are passed on the way to Master 2.
    expect(gap.passed).toBeCloseTo(1 / 3, 9);
    // 1% of players in 100 SR, where the ladder as a whole averages 2%: a thin stretch.
    expect(gap.crowding).toBeCloseTo(0.5, 9);
  });

  it('has nothing to say about a gap of nothing', () => {
    const gap = compareReadings(readAt(model, ladder, 3700), readAt(model, ladder, 3700), ladder);
    expect(gap.srGap).toBe(0);
    expect(gap.rarity).toBeNull();
    expect(gap.passed).toBeNull();
    expect(gap.crowding).toBeNull();
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

describe('monotone curve', () => {
  it('is a straight line through two points, and beyond them', () => {
    const line = monotoneCurve([0, 10], [1, 3]);
    expect(line.at(5)).toBeCloseTo(2);
    expect(line.at(-10)).toBeCloseTo(-1);
    expect(line.at(20)).toBeCloseTo(5);
    expect(line.slopeAt(7)).toBeCloseTo(0.2);
  });

  it('passes through its points and never turns back between them', () => {
    const xs = [0, 1, 2, 4, 5, 9];
    const ys = [0, 0.1, 3, 3.2, 8, 8.1];
    const curve = monotoneCurve(xs, ys);
    xs.forEach((x, i) => expect(curve.at(x)).toBeCloseTo(ys[i], 9));
    for (let x = 0; x < 9; x += 0.05) {
      expect(curve.at(x + 0.05)).toBeGreaterThanOrEqual(curve.at(x));
      expect(curve.slopeAt(x)).toBeGreaterThanOrEqual(0);
    }
  });

  it('reports the slope of the curve it draws', () => {
    const curve = monotoneCurve([0, 2, 3, 7], [0, 1, 4, 5]);
    for (const x of [0.5, 2.5, 4, 6.9]) {
      expect(curve.slopeAt(x)).toBeCloseTo((curve.at(x + 1e-5) - curve.at(x - 1e-5)) / 2e-5, 4);
    }
  });
});

describe('ladder midpoints', () => {
  it('puts midSr halfway through each division and tier', () => {
    expect(ladder.parseRank('Master 3').midSr).toBe(3750);
    expect(ladder.parseRank('Bronze 5').midSr).toBe(100);
    expect(ladder.tiers[0].midSr).toBe(500);
  });
});

describe('the game\'s highest reading, 99%', () => {
  // Rank screens only ever say "higher ranked than 99%" from the top 1% upwards.
  const below = [
    { rank: 'Diamond 5', betterThan: 84 },
    { rank: 'Master 3', betterThan: 97 },
    { rank: 'Master 2', betterThan: 98 },
  ];
  const mark = { rank: 'Grandmaster 5', betterThan: 99 };
  const above = [
    { rank: 'Grandmaster 3', betterThan: 99 },
    { sr: 4659, betterThan: 99, weight: 3 },
    { rank: 'Champion 1', betterThan: 99 },
  ];
  const SAMPLES = [0, 800, 2500, 3700, 4000, 4200, 4659, 4900, 4999];

  for (const type of ['normal', 'freeform']) {
    describe(`${type} curve`, () => {
      const build = (datapoints) => buildSeasonModel({ model: type, datapoints }, ladder);
      const marked = build([...below, mark]);
      // Given out of order, to show it is the lowest that is kept and not the first.
      const crowded = build([above[1], ...below, above[2], mark, above[0]]);

      it('fits the lowest datapoint reading 99% and no other', () => {
        expect(crowded.points.map((pt) => pt.counts)).toEqual([true, true, true, true, false, false, false]);
        expect(crowded.points[3].label).toBe('Grandmaster 5');
      });

      it('is the same curve however many more read 99% above it', () => {
        for (const sr of SAMPLES) {
          expect(crowded.cdf(sr), `${sr} SR`).toBe(marked.cdf(sr));
          expect(crowded.pdf(sr), `${sr} SR`).toBe(marked.pdf(sr));
        }
        expect(crowded.rmse).toBe(marked.rmse);
      });

      it('still counts every datapoint, and says what the curve makes of each', () => {
        expect(crowded.points).toHaveLength(7);
        for (const point of crowded.points.filter((pt) => !pt.counts)) {
          expect(point.fitted).toBeGreaterThan(0.99);
        }
      });

      it('is the same curve when those above give decimals, as a published graph does', () => {
        const decimals = build([...below, mark, ...above.map((pt, i) => ({ ...pt, betterThan: 99.3 + i * 0.3 }))]);
        expect(decimals.points.map((pt) => pt.counts)).toEqual([true, true, true, true, false, false, false]);
        for (const sr of SAMPLES) expect(decimals.cdf(sr), `${sr} SR`).toBe(marked.cdf(sr));
      });

      it('fits the mark at the figure it gives, whole or not', () => {
        const published = build([...below, { ...mark, betterThan: 99.4 }, ...above]);
        expect(published.points[3].counts).toBe(true);
        if (type === 'freeform') expect(published.cdf(4000)).toBeCloseTo(0.994, 9);
        expect(published.cdf(4000)).toBeGreaterThan(marked.cdf(4000));
      });

      it('still fits a figure under 99 that sits above the mark', () => {
        const points = build([...below, mark, { rank: 'Grandmaster 4', betterThan: 98.9 }]).points;
        expect(points.at(-1).counts).toBe(true);
      });
    });
  }

  it('carries on from the mark as a bell tail when the curve follows the data', () => {
    const model = buildSeasonModel({ model: 'freeform', datapoints: [...below, mark, ...above] }, ladder);
    // A bell curve is a straight line in z: from the mark up, each 100 SR adds the same z.
    // (Short of the top division, where what lies past 5,000 SR is stacked.)
    const z = (sr) => probit(model.cdf(sr));
    const step = z(4100) - z(4000);
    expect(step).toBeGreaterThan(0);
    for (const sr of [4100, 4300, 4700]) expect(z(sr + 100) - z(sr)).toBeCloseTo(step, 6);
  });

  it('leaves a season with one datapoint in the top 1% as it was', () => {
    // Season 17's only figure of 99 or more is Grandmaster 5, at 99.7: it is the mark, and there is nothing above it.
    const model = buildSeasonModel(season17, ladderOf(season17));
    expect(model.points.every((pt) => pt.counts)).toBe(true);
    expect(model.points.at(-1).fitted).toBeCloseTo(0.997, 9);
  });

  it('cannot make a curve from readings of 99% alone', () => {
    const { model, error } = tryBuildSeasonModel({ datapoints: [mark, ...above] }, ladder);
    expect(model).toBeNull();
    expect(error.message).toMatch(/at least two/);
  });
});

describe('roles', () => {
  it('gives every bundled datapoint a role', () => {
    for (const bundled of [season12, season17, season4, season]) {
      for (const point of bundled.datapoints) {
        expect(['tank', 'damage', 'support'], `${bundled.id} ${point.rank ?? point.sr}`).toContain(point.role);
      }
    }
    expect(season.datapoints.every((point) => point.role === 'tank')).toBe(true);
  });

  it('keeps a datapoint\'s role with it, and it does not change the curve', () => {
    const plain = buildSeasonModel({ datapoints: season.datapoints.map(({ role, ...point }) => point) }, ladder);
    const model = buildSeasonModel(season, ladder);
    expect(model.points.map((pt) => pt.role)).toEqual(['tank', 'tank']);
    expect(model.cdf(2600)).toBe(plain.cdf(2600));
  });

  it('rejects a role that is not one of the three', () => {
    const datapoints = [
      { rank: 'Master 3', betterThan: 97, role: 'tank' },
      { rank: 'Master 2', betterThan: 98, role: 'healer' },
    ];
    expect(() => buildSeasonModel({ datapoints }, ladder)).toThrow(/"role" must be/);
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
