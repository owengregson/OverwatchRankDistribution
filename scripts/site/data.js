/**
 * The numbers the article pages quote, computed from the same ladder,
 * bundled seasons and model the interactive chart uses. Nothing here is
 * typed in by hand: change a season file or the ladder and every article
 * follows on the next build.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatOneIn, formatPercent, formatSr } from '../../src/lib/format.js';
import { ladderOf } from '../../src/lib/ladder/ladders.js';
import { buildSeasonModel } from '../../src/lib/model/buildSeasonModel.js';

const seasonsDir = fileURLToPath(new URL('../../src/data/seasons/', import.meta.url));

/** Same order as src/data/seasons/index.js (which needs Vite's import.meta.glob). */
const sortSeasons = (seasons) => [...seasons].sort((a, b) => a.year - b.year || a.number - b.number);

function readSeasons() {
  const files = readdirSync(seasonsDir).filter((name) => name.endsWith('.json'));
  return sortSeasons(files.map((name) => JSON.parse(readFileSync(seasonsDir + name, 'utf8'))));
}

/** Season files the numbers depend on, for "last updated" dates. */
export const DATA_SOURCES = ['src/data/seasons', 'src/data/ladder.js', 'src/lib/model'];

export function loadSiteData() {
  // Each season is fitted on the ladder it was played on (`playedOn`), which is not the same for all of them.
  const seasons = readSeasons().flatMap((season) => {
    try {
      const playedOn = ladderOf(season);
      return [{ ...season, playedOn, model: buildSeasonModel(season, playedOn) }];
    } catch {
      return []; // A season that cannot be fitted yet is hidden, as on the site.
    }
  });
  if (!seasons.length) throw new Error('No season in src/data/seasons can be fitted.');

  // Everything below describes the newest season, on its ladder.
  const season = seasons.at(-1);
  const { model, playedOn: ladder } = season;

  const describeDivision = (division) => ({
    ...division,
    below: model.cdf(division.minSr),
    share: model.cdf(division.maxSr) - model.cdf(division.minSr),
    /** Share of players at or above the start of the division. */
    top: 1 - model.cdf(division.minSr),
    range: ladder.rangeLabel(division),
  });

  const tiers = ladder.tiers.map((tier) => ({
    ...tier,
    below: model.cdf(tier.minSr),
    share: model.cdf(tier.maxSr) - model.cdf(tier.minSr),
    top: 1 - model.cdf(tier.minSr),
    range: ladder.rangeLabel(tier),
    divisionList: tier.divisions.map(describeDivision),
  }));
  const tier = (id) => tiers.find((t) => t.id === id);
  const divisions = tiers.flatMap((t) => t.divisionList);

  /** The SR and rank below which a fraction `p` of players sit. */
  const at = (p) => {
    const sr = model.quantile(p);
    const division = divisions[ladder.divisionAt(sr).index];
    return { p, sr, division, tier: tier(division.tier.id) };
  };
  /** Rank you need to be in the top `fraction` of players. */
  const topCut = (fraction) => at(1 - fraction);

  const byShare = (list) => [...list].sort((a, b) => b.share - a.share);

  // SR widths, from the ladder: Bronze (the first tier) is wider than the rest.
  const span = (x) => x.maxSr - x.minSr;
  const widths = {
    tier: span(tiers[1]),
    division: span(tiers[1].divisions[0]),
    firstTier: span(tiers[0]),
    firstDivision: span(tiers[0].divisions[0]),
  };

  return {
    ladder,
    widths,
    seasons,
    season,
    model,
    /** Whether the newest season's curve is a fitted bell, not one drawn through its datapoints. */
    isBellFit: model.type === 'normal',
    tiers,
    tier,
    divisions,
    at,
    topCut,
    median: at(0.5),
    mostCommonTier: byShare(tiers)[0],
    tiersByShare: byShare(tiers),
    mostCommonDivision: byShare(divisions)[0],
    /** Share of players in this tier or any higher one. */
    atOrAbove: (id) => tier(id).top,
    pct: formatPercent,
    sr: formatSr,
    oneIn: (fraction) => formatOneIn(fraction) ?? formatPercent(fraction),
    /** Whole-number-ish percent for running text, e.g. "about 33%". */
    roughPct: (fraction) => {
      const v = fraction * 100;
      if (v >= 10) return `${Math.round(v)}%`;
      if (v >= 1) return `${v.toFixed(1).replace(/\.0$/, '')}%`;
      return formatPercent(fraction);
    },
  };
}
