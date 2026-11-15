/**
 * The FAQ's questions and answers. The page shows them, and the same list
 * becomes the page's FAQPage structured data, so the two cannot drift apart.
 */
function questions(d, h) {
  const t = Object.fromEntries(d.tiers.map((tier) => [tier.id, tier]));
  const top10 = d.topCut(0.1);
  const top1 = d.topCut(0.01);
  const top5 = d.topCut(0.05);
  return [
    {
      q: 'What is the Overwatch rank distribution?',
      a: `<p>It is how competitive players are spread across the ranks, from Bronze to Champion. On this site's estimate for ${d.season.name}, the most common tier is ${d.mostCommonTier.name} (${d.pct(d.mostCommonTier.share)} of players), the median player is in ${d.median.division.name}, and the numbers thin out toward both ends of the ladder in a bell curve. See ${h.a('overwatch-rank-distribution', 'the rank distribution explained')}.</p>`,
    },
    {
      q: 'What percent of Overwatch players are Diamond?',
      a: `<p>About ${d.pct(t.diamond.share)} of players are in Diamond, and Diamond or higher is about ${d.pct(t.diamond.top)}. Diamond 5 is better than ${d.pct(t.diamond.below)} of players. More in ${h.a('is-diamond-good', 'is Diamond good')}.</p>`,
    },
    {
      q: 'What percentage of players is in each rank?',
      a: `<p>Estimated for ${d.season.name}: ${d.tiers.map((x) => `${x.name} ${d.pct(x.share)}`).join(', ')}. The ${h.a('rank-percentages', 'rank percentages page')} breaks this down by division.</p>`,
    },
    {
      q: 'What rank is top 10% in Overwatch?',
      a: `<p>The top 10% starts at about ${d.sr(top10.sr)} SR on this site's scale, in ${top10.division.name}. The top 5% starts in ${top5.division.name} and the top 1% in ${top1.division.name}. See ${h.a('rank-percentiles', 'Overwatch rank percentiles')} for more cut-offs.</p>`,
    },
    {
      q: 'What is the average rank in Overwatch?',
      a: `<p>The median player is in ${d.median.division.name}, at about ${d.sr(d.median.sr)} SR on this site's scale. The middle half of players runs from ${d.at(0.25).division.name} to ${d.at(0.75).division.name}. See ${h.a('average-rank', 'the average Overwatch rank')}.</p>`,
    },
    {
      q: 'How many players are Grandmaster and Champion?',
      a: `<p>Grandmaster or higher is about ${d.pct(t.grandmaster.top)} of players (${d.oneIn(t.grandmaster.top)}), and Champion about ${d.pct(t.champion.top)} (${d.oneIn(t.champion.top)}). Blizzard does not publish player counts, so the site gives percentages rather than absolute numbers. See ${h.a('grandmaster-and-champion', 'Grandmaster and Champion')}.</p>`,
    },
    {
      q: 'What is the most common rank in Overwatch?',
      a: `<p>The most common tier is ${d.mostCommonTier.name}, with about ${d.pct(d.mostCommonTier.share)} of players, and the most common single division is ${d.mostCommonDivision.name} (${d.pct(d.mostCommonDivision.share)}). Divisions near the peak of the bell curve hold the most players, so the busiest ranks are the ones closest to the median.</p>`,
    },
    {
      q: 'Why are there so few Bronze players?',
      a: `<p>Because the distribution is a bell curve, both ends of the ladder are thin. Bronze is at the far left of the curve and holds about ${d.pct(t.bronze.share)} of players, even though it is the widest tier on the SR scale. Being in Bronze is about as unusual as being near the top of the ladder.</p>`,
    },
    {
      q: 'What SR does each rank start at?',
      a: `<p>The game shows ranks rather than a public SR number. On this site's 0 to ${d.sr(d.ladder.maxSr)} scale, ${d.tiers.map((x) => `${x.name} starts at ${d.sr(x.minSr)}`).join(', ')}. Each division is ${d.widths.division} SR wide, except in Bronze where it is ${d.widths.firstDivision}. The full list is in ${h.a('sr-by-rank', 'Overwatch SR by rank')}.</p>`,
    },
    {
      q: 'Are these official Blizzard numbers?',
      a: `<p>No. Blizzard does not publish a full rank distribution. These are estimates fitted to ${d.datapoints.length} community-submitted datapoint${d.datapoints.length === 1 ? '' : 's'} for ${d.season.name}, each checked against a screenshot. The site is an unofficial fan project and is not affiliated with Blizzard Entertainment.</p>`,
    },
    {
      q: 'How is the rank distribution estimated?',
      a: `<p>Each datapoint says what share of players a rank is better than. Converted to z-scores, those points lie on a straight line against SR if ratings follow a bell curve, so the site fits a weighted least-squares line through them and keeps the curve inside the SR range. The details are in ${h.a('how-the-estimate-works', 'how the estimate is made')}.</p>`,
    },
    {
      q: 'How accurate are the percentages?',
      a: `<p>They are most reliable near the submitted datapoints (currently ${h.datapointList()}) and least reliable far from them, especially in the top tiers, where small changes in the shape of the curve matter most. More datapoints across the ladder make every number more robust.</p>`,
    },
    {
      q: 'Does the distribution differ by role?',
      a: `<p>Overwatch keeps a separate rank for each role, and each role has its own distribution. This site fits one curve per season for competitive players as a whole and does not split by role.</p>`,
    },
    {
      q: 'Does the distribution change every season?',
      a: `<p>It can. Each season gets its own curve from its own datapoints, and resets, ladder changes and who is playing all shift it. See ${h.a('rank-distribution-by-season', 'the rank distribution by season')}.</p>`,
    },
    {
      q: 'Can I add my own datapoint?',
      a: `<p>The site is built to take submissions: a datapoint is your rank plus the percentage of players the game says it is better than, with a screenshot as proof. Each one is reviewed against its screenshot before it is added to the season's fit. Submissions appear on the site when the database is connected.</p>`,
    },
    {
      q: 'How do I find my own rank\'s percentile?',
      a: `<p>Open ${h.chart('the interactive chart')} and use the finder: enter an SR, a percentage of players to beat, or pick a rank, and the chart jumps there and reads out the percentile, the share of players in your division and the distance to the next one.</p>`,
    },
  ];
}

export default {
  slug: 'faq',
  title: 'Overwatch Rank Distribution FAQ',
  description: (d) =>
    `Answers to common questions about the Overwatch rank distribution: rank percentages, what rank is top 10%, the average rank, SR thresholds and how the ${d.season.name} estimate is made.`,
  keywords: ['overwatch rank distribution faq', 'overwatch rank questions', 'overwatch rank percentage', 'overwatch percentile faq'],
  section: 'FAQ',
  related: ['overwatch-rank-distribution', 'rank-percentages', 'rank-percentiles', 'how-the-estimate-works'],
  faq: questions,
  body: (d, h) => `
<p>Short answers to the questions people most often ask about the Overwatch rank distribution, with links to the longer articles. All figures are estimates for ${d.season.name} from the same curve as ${h.chart('the interactive rank distribution chart')}.</p>

${h.estimateNote()}

${questions(d, h)
  .map(({ q, a }) => `<section class="qa">
<h2>${q}</h2>
${a}
</section>`)
  .join('\n\n')}

${h.cta()}
`,
};
