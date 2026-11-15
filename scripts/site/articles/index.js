/**
 * Every article, in the order the articles index lists them.
 *
 * An article module exports { slug, title, description(d), keywords,
 * section, related: [slug], body(d, kit) } and optionally faq(d, kit) for
 * FAQPage structured data. `d` is the site data (../data.js) and `kit` the
 * helpers in ../kit.js. Numbers must come from `d`, never be typed in.
 */
import averageRank from './average-rank.js';
import faq from './faq.js';
import grandmasterAndChampion from './grandmaster-and-champion.js';
import howTheEstimateWorks from './how-the-estimate-works.js';
import isDiamondGood from './is-diamond-good.js';
import isMasterGood from './is-master-good.js';
import overwatchRankDistribution from './overwatch-rank-distribution.js';
import rankDistributionBySeason from './rank-distribution-by-season.js';
import rankPercentages from './rank-percentages.js';
import rankPercentiles from './rank-percentiles.js';
import ranksInOrder from './ranks-in-order.js';
import srByRank from './sr-by-rank.js';

export const ARTICLES = [
  overwatchRankDistribution,
  rankPercentages,
  rankPercentiles,
  srByRank,
  averageRank,
  ranksInOrder,
  isDiamondGood,
  isMasterGood,
  grandmasterAndChampion,
  rankDistributionBySeason,
  howTheEstimateWorks,
  faq,
];

/** Source file of an article, for its git dates. */
export const articleSource = (slug) => `scripts/site/articles/${slug}.js`;
