export default {
  slug: 'overwatch-rank-distribution',
  title: 'Overwatch Rank Distribution Explained',
  description: (d) =>
    `How Overwatch competitive ranks are spread across players, from Bronze to Champion: the most common rank, the median, and what share of players each tier holds in ${d.season.name}.`,
  keywords: ['overwatch rank distribution', 'overwatch 2 rank distribution', 'overwatch rank distribution chart', 'competitive rank distribution'],
  section: 'Rank distribution',
  related: ['rank-percentages', 'rank-percentiles', 'sr-by-rank', 'how-the-estimate-works'],
  body: (d, h) => {
    const common = d.mostCommonTier;
    const second = d.tiersByShare[1];
    const third = d.tiersByShare[2];
    const middleThree = common.share + second.share + third.share;
    const master = d.tier('master');
    const bronze = d.tier('bronze');
    const champion = d.tier('champion');
    const gm = d.tier('grandmaster');
    const quartileLow = d.at(0.25);
    const quartileHigh = d.at(0.75);
    return `
<p>The Overwatch rank distribution is the answer to a simple question: out of everyone who plays competitive, how many end up in each rank? This page walks through the current estimate for ${d.season.name}, explains why the ranks form a bell curve, and shows where the middle, the top and the bottom of the ladder sit. If you would rather explore than read, ${h.chart('the interactive rank distribution chart')} lets you move across the curve and see the rank and percentile at every point.</p>

${h.curve({
  label: `Curve of the ${d.season.name} Overwatch rank distribution, coloured by tier from Bronze to Champion.`,
  caption: `The estimated ${d.season.name} rank distribution. The height of the curve is how many players sit at each SR; each colour is one tier.`,
  markers: [{ sr: d.median.sr, label: `Median: ${d.median.division.name}` }],
})}

<h2>The short version</h2>
<p>Competitive Overwatch has ${d.tiers.length} tiers: ${d.tiers.map((t) => t.name).join(', ')}. Each tier is split into ${d.ladder.divisionsPerTier} divisions, numbered ${d.ladder.divisionsPerTier} (lowest) to 1 (highest). Players are not spread evenly across them. Most people sit in a few tiers around the middle, and the numbers thin out quickly in both directions.</p>
<ul>
  <li>The most common tier is ${h.tierName(common)}, with about ${d.roughPct(common.share)} of players. ${second.name} (${d.roughPct(second.share)}) and ${third.name} (${d.roughPct(third.share)}) come next, so those three tiers alone hold roughly ${d.roughPct(middleThree)} of the player base.</li>
  <li>The median player, the one exactly in the middle, is in ${d.median.division.name} (about ${d.sr(d.median.sr)} SR on this site's scale).</li>
  <li>Half of all players fall between ${quartileLow.division.name} and ${quartileHigh.division.name}.</li>
  <li>Master and above is about ${d.roughPct(master.top)} of players, Grandmaster and above about ${d.pct(gm.top)}, and Champion about ${d.pct(champion.top)}.</li>
  <li>Bronze is about ${d.pct(bronze.share)}: as rare at the bottom as the high ranks are at the top.</li>
</ul>

${h.estimateNote()}

<h2>Why ranks form a bell curve</h2>
<p>Skill in a large population tends to follow a normal distribution: lots of people near the average, fewer and fewer as you move away from it. Matchmaking ratings are built to measure that skill, and ranks are just labels laid over the rating. So when you plot how many players hold each rating, you get a bell shape.</p>
<p>The ladder then cuts that bell into tiers of equal width. On this site's scale Bronze covers ${d.sr(bronze.maxSr - bronze.minSr)} SR and every other tier covers ${d.sr(d.tier('silver').maxSr - d.tier('silver').minSr)} SR. Because the bell is tallest in the middle, a tier near the centre catches far more players than a tier of the same width out at the edges. That is the whole reason ${common.name} is crowded and ${champion.name} is nearly empty, even though they span the same number of SR points.</p>
<p>This also explains why climbing feels different at different points of the ladder. Near the middle of the curve, a hundred SR moves you past a large slice of the player base. Near the top, the same hundred SR passes very few people, because there are very few people up there to pass. The ${h.a('rank-percentiles', 'rank percentiles article')} goes through those numbers in detail.</p>

<h2>Share of players in each tier</h2>
<p>Here is the estimated share of players in each tier, from the same fitted curve. "Better than" is the percentage of players below the first division of the tier, which is the number most people mean when they ask what percentile a rank is.</p>

${h.tierBars({
  label: 'Bar chart of the estimated share of players in each Overwatch tier.',
  caption: `Estimated share of players in each tier, ${d.season.name}.`,
})}

${h.tierTable()}

<p>For the same breakdown division by division, and for the SR each division starts at, see ${h.a('rank-percentages', 'what percentage of players are in each rank')} and ${h.a('sr-by-rank', 'Overwatch SR by rank')}.</p>

<h2>Reading the distribution chart</h2>
<p>${h.chart('The chart on the home page')} draws this curve full size. The horizontal axis is SR, from 0 on the left to ${d.sr(d.ladder.maxSr)} on the right, with a coloured strip marking each tier. The height of the curve shows how many players sit at that SR. As you move the pointer, the panel reads out the rank under it, the share of players below and above that point, and how many SR it takes to reach the next division.</p>
<p>Three tools sit around the curve. The finder jumps to a point on the curve by SR, by the percentage of players you want to beat, or by picking a rank. The compare panel pins one rank so you can measure the gap to another, in SR, divisions and players. And the season picker in the header switches between seasons once more than one has enough datapoints.</p>

<h2>What this distribution is not</h2>
<p>A few limits are worth knowing before you quote these numbers anywhere.</p>
<p><strong>It is an estimate.</strong> Blizzard does not publish a full rank distribution. The curve here is fitted to ${d.datapoints.length} datapoint${d.datapoints.length === 1 ? '' : 's'} that players submitted with screenshots, each saying what share of players a given rank is better than. ${d.isBellFit ? 'A bell curve through those points fills in the rest of the ladder' : 'A curve drawn through those points fills in the rest of the ladder'}. Ranks close to the datapoints are the best supported; ranks far from them rely more on the assumption that the curve is bell-shaped there. The ${h.a('how-the-estimate-works', 'methodology page')} explains the fit.</p>
<p><strong>It is one curve.</strong> Overwatch keeps a separate rank for each role queue, and those distributions are not identical. This site does not split by role; it shows a single distribution for the season.</p>
<p><strong>The SR numbers are a scale, not the game's hidden rating.</strong> The game shows your rank and division rather than a public SR number. The site places the ladder on a 0 to ${d.sr(d.ladder.maxSr)} SR scale so that distances between ranks can be measured. The ${h.a('sr-by-rank', 'SR by rank page')} lists the range for every division.</p>

${h.cta()}

<h2>Where to go next</h2>
<p>If you want one number for your own rank, the quickest route is the ${h.chart('interactive chart')}: type your rank into the finder. If you are wondering whether your rank is good, there are pages for ${h.a('is-diamond-good', 'Diamond')} and ${h.a('is-master-good', 'Master')}, and one on ${h.a('grandmaster-and-champion', 'how many players reach Grandmaster and Champion')}. For an overview of every tier, read the ${h.a('ranks-in-order', 'Bronze to Champion tier guide')}.</p>
`;
  },
};
