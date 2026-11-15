import { readAt, tierShares } from '../../../src/lib/model/reading.js';

export default {
  slug: 'rank-distribution-by-season',
  title: 'Overwatch Rank Distribution by Season',
  description: (d) =>
    `The Overwatch rank distribution season by season: median rank, most common tier and the share of Diamond, Master and Grandmaster players for ${d.seasons.length === 1 ? d.season.name : `${d.seasons.length} seasons up to ${d.season.name}`}.`,
  keywords: (d) => ['overwatch rank distribution by season', `overwatch rank distribution ${d.season.year}`, 'overwatch season rank distribution', 'overwatch rank distribution current season'],
  section: 'Rank distribution',
  related: ['overwatch-rank-distribution', 'how-the-estimate-works', 'average-rank', 'faq'],
  body: (d, h) => {
    // Each season is read on the ladder it was played on.
    const rows = d.seasons.map((s) => {
      const shares = tierShares(s.model, s.playedOn);
      const top = (id) => 1 - s.model.cdf(s.playedOn.tiers.find((t) => t.id === id).minSr);
      const median = readAt(s.model, s.playedOn, s.model.quantile(0.5));
      const common = [...shares].sort((a, b) => b.share - a.share)[0];
      return { s, median, common, top };
    });
    const single = d.seasons.length === 1;
    const first = rows[0];
    const last = rows.at(-1);
    /** Whether the seasons listed were played on more than one ladder (Emerald was added part-way through). */
    const ladderChanged = d.seasons.some((s) => s.playedOn !== d.ladder);
    const hasEmerald = (s) => s.playedOn.tiers.some((t) => t.id === 'emerald');
    return `
<p>Each competitive season has its own rank distribution, and this site fits a separate curve for every season it has data for. This page lists them side by side: where the median player sits, which tier is the most crowded, and how many players reach Diamond, Master and Grandmaster. ${single ? `So far the site has a fitted curve for one season, ${d.season.name}; this page will grow as more seasons are added.` : `The site currently has ${d.seasons.length} fitted seasons, from ${d.seasons[0].name} to ${d.season.name}.`} To switch between seasons yourself, use the season tabs on ${h.chart('the interactive rank distribution chart')}.</p>

${h.estimateNote()}

<h2>Season by season</h2>
<div class="table-wrap panel"><table>
  <caption>Estimated rank distribution for each season</caption>
  <thead><tr><th scope="col">Season</th><th scope="col">Curve</th><th scope="col">Ladder</th><th scope="col">Median rank</th><th scope="col">Most common tier</th><th scope="col">Diamond or higher</th><th scope="col">Master or higher</th><th scope="col">Grandmaster or higher</th></tr></thead>
  <tbody>
${[...rows]
  .reverse()
  .map(
    ({ s, median, common, top }) =>
      `    <tr><th scope="row">${s.name}</th><td>${s.model.label}</td><td>${hasEmerald(s) ? 'With Emerald' : 'Before Emerald'}</td><td>${median.division.name}</td><td>${common.tier.name} (${d.pct(common.share)})</td><td>${d.pct(top('diamond'))}</td><td>${d.pct(top('master'))}</td><td>${d.pct(top('grandmaster'))}</td></tr>`,
  )
  .join('\n')}
  </tbody>
</table></div>

<h2>Reading the season table</h2>
<p>Each column answers a question players ask about a season. <strong>Curve</strong> is how the season's curve is made from its datapoints: "Bell curve" is the bell closest to a few community datapoints, and "Follows the data" is a curve drawn through every datapoint, used when a season's distribution is known across the ladder. The ${h.a('how-the-estimate-works', 'methodology page')} describes both. <strong>Ladder</strong> says whether the season was played before or after the Emerald tier was added between Platinum and Diamond. <strong>Median rank</strong> is the division of the player exactly in the middle. <strong>Most common tier</strong> is the tier with the largest share of players, with that share in brackets. The last three columns are cumulative: the share of players at or above the first division of Diamond, Master and Grandmaster.</p>
<p>Cumulative shares are the most practical way to compare seasons, because they do not depend on how the middle of the ladder is split. If "Master or higher" grows from one season to the next, it is easier to reach the top tiers that season, whatever happened to the tiers below.</p>
<p>For any single rank, the most direct comparison is its percentile in each season: the share of players that rank was better than. The season tabs on the chart switch the whole curve, so you can pin a rank, change season and watch its percentile move.</p>

<h2>${d.season.name}</h2>
<p>The latest season's curve is centred on about ${d.sr(d.model.mean)} SR on this site's scale, with a standard deviation of about ${d.sr(d.model.sd)} SR. The median player is in ${d.median.division.name}, and the most common tier is ${d.mostCommonTier.name} with ${d.pct(d.mostCommonTier.share)} of players.</p>

${h.curve({
  label: `Curve of the ${d.season.name} Overwatch rank distribution.`,
  caption: `The ${d.season.name} rank distribution, coloured by tier.`,
  markers: [{ sr: d.median.sr, label: `Median: ${d.median.division.name}` }],
})}

${h.tierBars({
  label: `Share of players in each tier, ${d.season.name}.`,
  caption: `Share of players in each tier, ${d.season.name}.`,
})}

${single ? '' : `<h2>What changed between seasons</h2>
<p>From ${first.s.name} to ${last.s.name}, the median moved from ${first.median.division.name} to ${last.median.division.name}, and the share of players at Master or higher went from ${d.pct(first.top('master'))} to ${d.pct(last.top('master'))}. Remember that each season is fitted from its own datapoints, so some of the difference between seasons comes from which ranks people happened to report, not only from real changes in the player base.${ladderChanged ? ' The ladder itself also changed over these seasons: Emerald was added between Platinum and Diamond, so a median rank from before that change and one from after it are not on the same set of tiers.' : ''}</p>`}

<h2>Why the distribution changes from season to season</h2>
<p>Several things can move the curve between one season and the next:</p>
<ul>
  <li><strong>Rank resets and adjustments.</strong> When a new season starts, ranks can be reset or adjusted, which shifts where players land on the ladder for the first part of the season.</li>
  <li><strong>Changes to the ladder.</strong> When tiers are added or the system that turns ratings into ranks is retuned, the same players can end up spread differently across the ranks.</li>
  <li><strong>Who is playing.</strong> New players joining, returning players coming back, and the time of the season all change the population being measured.</li>
  <li><strong>Which datapoints were submitted.</strong> The site's curve can only be as good as its datapoints. A season with many datapoints spread across the ladder is pinned down well; a season with a few clustered in one tier relies more on the bell-curve shape for everything else.</li>
</ul>

<h2>How a new season gets a curve</h2>
<p>A season starts with no datapoints and stays hidden from visitors. Players submit what share of players their rank is better than, with a screenshot, and an admin checks each one against its screenshot before approving it. Once a season has at least two approved datapoints at different ranks, a curve can be fitted and the season appears on the chart. Every approved datapoint after that refines the fit.</p>
<p>The article pages are rebuilt from the seasons bundled with the site each time it is deployed, so the tables here follow the data. The interactive chart loads the latest approved datapoints directly, so it can be a step ahead of these pages between deploys.</p>

<h2>Comparing seasons fairly</h2>
<p>When you compare seasons, look at the kind of curve behind each one first. Two seasons fitted as bell curves from a handful of points each can differ simply because of which ranks were reported. Differences in the middle of the ladder are usually more trustworthy than differences in the far tail, where Grandmaster and Champion figures depend heavily on the shape of the curve. The ${h.a('how-the-estimate-works', 'methodology page')} explains why.</p>
<p>It also helps to compare like with like. ${ladderChanged ? 'Diamond, Master, Grandmaster and Champion sit in the same place on the ladder in every season on this site, so a percentile for "Master 3" can be compared across all of them. The tiers below Diamond cannot be compared so directly across the Emerald change: before it, Bronze to Platinum covered the stretch of ladder that Bronze to Emerald covers now, so a rank such as Platinum 3 was a higher position then than it is today.' : 'A percentile for "Master 3" means the same thing in every season on this site, because the ladder positions are the same.'} The ${h.a('rank-percentages', 'rank percentages page')} has the full table for the current season, and the ${h.a('faq', 'FAQ')} answers common questions about the data.</p>

${h.cta('Use the season tabs on the chart to switch seasons and see how the curve and your rank\'s percentile change.')}
`;
  },
};
