export default {
  slug: 'rank-percentages',
  title: 'What Percentage of Players Are in Each Overwatch Rank?',
  description: (d) =>
    `Overwatch rank percentages by tier and division for ${d.season.name}: what percent of players are Gold, Platinum, Emerald, Diamond, Master, Grandmaster and Champion.`,
  keywords: ['overwatch rank percentage by tier', 'what percent of players are diamond', 'overwatch rank percentages', 'percentage of players in each rank'],
  section: 'Rank distribution',
  related: ['overwatch-rank-distribution', 'rank-percentiles', 'is-diamond-good', 'grandmaster-and-champion'],
  body: (d, h) => {
    const t = Object.fromEntries(d.tiers.map((tier) => [tier.id, tier]));
    const div = d.mostCommonDivision;
    const plat = t.platinum;
    const diamondAndUp = t.diamond.top;
    return `
<p>What percent of Overwatch players are Diamond? How rare is Master? This page gives the estimated percentage of players in every rank, tier by tier and division by division, for ${d.season.name}. The figures come straight from the fitted curve behind ${h.chart('the interactive rank distribution chart')}, so they match what the chart shows when you move across it.</p>

${h.estimateNote()}

<h2>Overwatch rank percentage by tier</h2>
<p>The quickest overview is the share of all competitive players in each tier. ${t[d.mostCommonTier.id].name} is the largest tier, with ${d.pct(d.mostCommonTier.share)} of players, followed by ${d.tiersByShare[1].name} at ${d.pct(d.tiersByShare[1].share)}. The shares then fall away quickly at both ends of the ladder.</p>

${h.tierBars({
  label: 'Bar chart of the estimated percentage of players in each Overwatch tier.',
  caption: `Percentage of players in each tier, estimated for ${d.season.name}.`,
})}

<ul>
  <li><strong>Bronze:</strong> ${d.pct(t.bronze.share)} of players.</li>
  <li><strong>Silver:</strong> ${d.pct(t.silver.share)}.</li>
  <li><strong>Gold:</strong> ${d.pct(t.gold.share)}.</li>
  <li><strong>Platinum:</strong> ${d.pct(t.platinum.share)}.</li>
  <li><strong>Emerald:</strong> ${d.pct(t.emerald.share)}.</li>
  <li><strong>Diamond:</strong> ${d.pct(t.diamond.share)}.</li>
  <li><strong>Master:</strong> ${d.pct(t.master.share)}.</li>
  <li><strong>Grandmaster:</strong> ${d.pct(t.grandmaster.share)}.</li>
  <li><strong>Champion:</strong> ${d.pct(t.champion.share)}.</li>
</ul>

<h2>What percent of players are Diamond?</h2>
<p>About ${d.pct(t.diamond.share)} of players are in Diamond, which makes it ${ordinal(d.tiersByShare.findIndex((x) => x.id === 'diamond') + 1)} largest tier. More useful for most people is the cumulative figure: Diamond or higher is about ${d.pct(diamondAndUp)} of players, so reaching Diamond 5 puts you ahead of roughly ${d.roughPct(t.diamond.below)} of the player base. Inside the tier the spread is uneven. Diamond 5 alone holds ${d.pct(t.diamond.divisionList[0].share)} of players while Diamond 1 holds ${d.pct(t.diamond.divisionList.at(-1).share)}, because the curve is still falling steeply through this part of the ladder. There is a full page on ${h.a('is-diamond-good', 'whether Diamond is a good rank')}.</p>

<h2>What percent of players are Master, Grandmaster and Champion?</h2>
<p>Master holds about ${d.pct(t.master.share)} of players, and Master or higher is ${d.pct(t.master.top)}. Grandmaster is ${d.pct(t.grandmaster.share)} of players on its own, and Champion ${d.pct(t.champion.share)}. Put another way, about ${d.oneIn(t.grandmaster.top)} players is Grandmaster or higher, and ${d.oneIn(t.champion.top)} is Champion. The ${h.a('grandmaster-and-champion', 'Grandmaster and Champion page')} looks at those top tiers in more detail, and ${h.a('is-master-good', 'is Master good')} covers the tier below.</p>

<h2>Gold, Platinum and Emerald: the middle of the ladder</h2>
<p>Most players live in the middle three or four tiers. Gold holds ${d.pct(t.gold.share)}, Platinum ${d.pct(plat.share)} and Emerald ${d.pct(t.emerald.share)}. Together, Gold through Emerald account for ${d.pct(t.gold.share + plat.share + t.emerald.share)} of all players. The single most common division is ${div.name}, with ${d.pct(div.share)} of players, and the median player sits in ${d.median.division.name}. If you are anywhere in Platinum or Emerald, you are surrounded by a large share of the player base, which is why matches there can feel so varied.</p>

<h2>Bronze and Silver</h2>
<p>The low end is smaller than many players expect. Bronze holds ${d.pct(t.bronze.share)} of players and Silver ${d.pct(t.silver.share)}. Reaching Gold 5 already puts you ahead of ${d.pct(t.gold.below)} of players. Because the curve is a bell, the bottom of the ladder is as thin as the top: being in Bronze is about as unusual as being in ${closestTop(d, t.bronze.share)}.</p>

<h2>Percentage of players in every division</h2>
<p>The table below splits each tier into its ${d.ladder.divisionsPerTier} divisions. "Players in division" is the share of all players inside that division. "Better than" is the share of players below the first SR of the division, and "Top" is the share at or above it.</p>

${h.divisionTable()}

<h2>How to read percentages and percentiles</h2>
<p>Two different numbers get called "rank percentage", and they are easy to mix up.</p>
<p>The first is the <strong>share of players in a rank</strong>: how many people are in Diamond, for example. That is the "players in tier" and "players in division" column above, and the numbers across all ranks add up to 100%.</p>
<p>The second is the <strong>percentile</strong>: how many players a rank is better than. A Diamond 5 player is better than ${d.pct(t.diamond.below)} of players. That number is cumulative, so it grows as you climb. The ${h.a('rank-percentiles', 'rank percentiles page')} works in this direction, starting from "top 10%" or "top 1%" and finding the rank that matches.</p>
<p>The game's own percentage, where it shows one, is the second kind. Datapoints submitted to this site use that number for a specific rank, and the curve is fitted to them.</p>

<h2>Why the divisions are not equal</h2>
<p>Each division covers the same SR width (${d.widths.division} SR, except in Bronze where it is ${d.widths.firstDivision}), but the number of players in each varies a lot. A division near the peak of the curve, such as ${div.name}, takes in many more players than one out on the slope. That is why the percentage drops by small steps through the middle of the ladder and by tiny fractions once you are past Master. The ${h.a('sr-by-rank', 'SR by rank page')} lists where every division starts.</p>

${h.cta('Pick any rank on the chart to see its share of players, how many it is better than, and how far it is to the next division.')}
`;
  },
};

function ordinal(n) {
  return ['the', 'the second', 'the third', 'the fourth', 'the fifth', 'the sixth', 'the seventh', 'the eighth', 'the ninth'][n - 1] ?? `number ${n}, the`;
}

/** The tier whose "at or above" share is closest to `share` (used to compare the two ends of the bell). */
function closestTop(d, share) {
  const best = [...d.tiers].filter((t) => t.id !== 'bronze').sort((a, b) => Math.abs(a.top - share) - Math.abs(b.top - share))[0];
  return `${best.name} or higher (${d.pct(best.top)})`;
}
