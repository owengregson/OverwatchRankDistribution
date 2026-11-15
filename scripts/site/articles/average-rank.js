export default {
  slug: 'average-rank',
  title: 'What Is the Average Rank in Overwatch?',
  description: (d) =>
    `The average Overwatch rank in ${d.season.name} is estimated at ${d.median.division.name}. See the median, the most common tier and division, and the middle half of the ladder.`,
  keywords: ['average overwatch rank', 'median rank overwatch', 'most common rank overwatch', 'what is the average rank in overwatch 2'],
  section: 'Percentiles',
  related: ['rank-percentiles', 'rank-percentages', 'overwatch-rank-distribution', 'ranks-in-order'],
  body: (d, h) => {
    const med = d.median;
    const q1 = d.at(0.25);
    const q3 = d.at(0.75);
    const common = d.mostCommonTier;
    const commonDiv = d.mostCommonDivision;
    const meanSr = d.model.mean;
    /** Whether the mean and the median land in the same division, as they do on a symmetrical curve. */
    const meanAtMedian = d.ladder.divisionAt(meanSr).name === med.division.name;
    const gold = d.tier('gold');
    const plat = d.tier('platinum');
    const diamond = d.tier('diamond');
    return `
<p>The average Overwatch rank, by the estimate on this site, is <strong>${med.division.name}</strong>. Half of competitive players are below that point and half above it. This page explains how that figure is worked out, why the most common tier is ${common.name}, and what range counts as "average" if you want something wider than a single division. The figures are for ${d.season.name} and come from the curve behind ${h.chart('the interactive rank distribution chart')}.</p>

${h.estimateNote()}

<h2>Median, mean and mode</h2>
<p>"Average" can mean three different things, and for ranks they mostly agree.</p>
<ul>
  <li><strong>Median:</strong> the rank of the player exactly in the middle. The estimate is about ${d.sr(med.sr)} SR, which is ${med.division.name}.</li>
  <li><strong>Mean:</strong> the SR of every player added up and divided by the number of players, about ${d.sr(meanSr)} SR (${d.ladder.divisionAt(meanSr).name}). ${meanAtMedian ? 'On a symmetrical curve it lands in the same place as the median, and here the two are in the same division.' : 'On a symmetrical curve it would land in the same place as the median; this curve is lopsided enough to put the two in different divisions.'}</li>
  <li><strong>Mode:</strong> the most crowded spot. The busiest tier is ${common.name} with ${d.pct(common.share)} of players, and the busiest single division is ${commonDiv.name} with ${d.pct(commonDiv.share)}.</li>
</ul>
<p>So whichever definition you prefer, the average player is in ${med.tier.name}. The SR numbers here are on this site's scale; the game itself shows ranks rather than a public SR number. See ${h.a('sr-by-rank', 'Overwatch SR by rank')} for the full scale.</p>

${h.curve({
  label: `Overwatch rank distribution with the median and the middle 50% of players marked.`,
  caption: `The middle half of players, ${q1.division.name} to ${q3.division.name}, with the median marked. Tiers outside that range are dimmed.`,
  markers: [
    { sr: q1.sr, label: `25%: ${q1.division.name}` },
    { sr: med.sr, label: `Median: ${med.division.name}` },
    { sr: q3.sr, label: `75%: ${q3.division.name}` },
  ],
  shade: [q1.sr, q3.sr],
})}

<h2>What counts as an average rank?</h2>
<p>A single division is a narrow definition of average. A more useful one is the middle half of players: everyone between the 25th and the 75th percentile. On the current curve that runs from about ${d.sr(q1.sr)} SR (${q1.division.name}) to about ${d.sr(q3.sr)} SR (${q3.division.name}). If your rank is anywhere in that band, you are squarely in the middle of the player base.</p>
<p>That band covers ${d.sr(q3.sr - q1.sr)} SR, or roughly ${Math.round((q3.sr - q1.sr) / (plat.divisionList[0].maxSr - plat.divisionList[0].minSr))} divisions. It is a reminder of how tightly packed the middle of the ladder is: half of all players fit into a stretch about ${((q3.sr - q1.sr) / (plat.maxSr - plat.minSr)).toFixed(1)} tiers wide, out of a ladder of ${d.tiers.length}.</p>

<h2>Is Gold or Platinum average?</h2>
<p>It depends which end of the tier you are in. Gold 5 is better than only ${d.pct(gold.below)} of players and Gold 1 better than ${d.pct(gold.divisionList.at(-1).below)}, so Gold sits below the median throughout. Platinum runs from ${d.pct(plat.below)} at Platinum 5 to ${d.pct(plat.divisionList.at(-1).below)} at Platinum 1, ${plat.maxSr <= med.sr ? 'which is still below the halfway mark' : 'so the upper part of Platinum is around the middle of the ladder'}. ${med.tier.name === 'Emerald' ? `Emerald is where the median lands: Emerald 5 is better than ${d.pct(d.tier('emerald').below)} of players and Emerald 1 better than ${d.pct(d.tier('emerald').divisionList.at(-1).below)}.` : ''}</p>
<p>${diamond.below > 0.5 ? `Diamond, by contrast, starts above average: Diamond 5 is already better than ${d.pct(diamond.below)} of players. If you are in Diamond, you are above the median, not at it. There is more on that in ${h.a('is-diamond-good', 'is Diamond good')}.` : `Diamond 5 is better than ${d.pct(diamond.below)} of players.`}</p>

<h2>Why the average rank feels higher or lower than it is</h2>
<p>Many players guess the average rank wrongly, usually too high. A few reasons for that:</p>
<p><strong>Who you see.</strong> Streams, guides and highlight clips come mostly from high-ranked players. Spend enough time watching them and Diamond starts to feel ordinary, when Diamond or higher is in fact only about ${d.roughPct(diamond.top)} of players.</p>
<p><strong>Who you play with.</strong> Matchmaking puts you with people near your own rank, so whatever rank you are, most of the players you meet are close to it. Your sense of "normal" drifts toward your own position on the ladder.</p>
<p><strong>Tier names.</strong> Names like Platinum and Diamond sound high-end. In practice they are the middle and upper-middle of the curve.</p>

<h2>The average rank as a share of players</h2>
<p>The table shows the share of players in each tier and the percentile at the start of each. The median sits in ${med.tier.name}, the tier where "better than" crosses 50%.</p>

${h.tierTable()}

<h2>Does the average rank change between seasons?</h2>
<p>It can. Each season is fitted separately from its own datapoints, so a season where the reported percentages shift will produce a different curve and a different median. The ${h.a('rank-distribution-by-season', 'rank distribution by season')} page compares every season the site has data for. Rank resets and changes to the ladder between seasons can move the middle as well.</p>

<h2>How far above or below average are you?</h2>
<p>The distance from the median is easy to measure on this site's scale. Count the divisions between your rank and ${med.division.name}: each one is ${d.widths.division} SR outside Bronze. Then look at the percentile. A player in ${d.tier('gold').divisionList[0].name} is about ${d.sr(med.sr - d.tier('gold').minSr)} SR below the median and better than ${d.pct(gold.below)} of players. A player in ${diamond.divisionList[0].name} is about ${d.sr(diamond.minSr - med.sr)} SR above it and better than ${d.pct(diamond.below)}. On a symmetrical bell curve, two ranks the same distance either side of the middle in SR sit equally far below and above 50%; compare the two percentiles to see how close this season comes to that.</p>
<p>The compare panel on the chart does this for you: pin the median, move to your rank, and it shows the gap in SR, in divisions and in the share of players between the two.</p>

${h.cta('Move to the middle of the curve on the chart to see the median player\'s rank and how many SR separate it from yours.')}

<p>For the cut-offs above the middle, like top 10% or top 1%, read ${h.a('rank-percentiles', 'Overwatch rank percentiles')}. For the share of players in every division, see ${h.a('rank-percentages', 'what percentage of players are in each rank')}.</p>
`;
  },
};
