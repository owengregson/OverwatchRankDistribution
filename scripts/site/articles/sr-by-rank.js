export default {
  slug: 'sr-by-rank',
  title: 'Overwatch SR by Rank: Where Every Rank and Division Starts',
  description: (d) =>
    `The SR range of every Overwatch rank and division on a 0–${d.sr(d.ladder.maxSr)} scale, with the estimated SR distribution and percentile at each threshold for ${d.season.name}.`,
  keywords: ['overwatch sr distribution', 'overwatch sr by rank', 'overwatch rank sr ranges', 'sr for each rank overwatch'],
  section: 'Ranks and SR',
  related: ['ranks-in-order', 'rank-percentages', 'rank-percentiles', 'overwatch-rank-distribution'],
  body: (d, h) => {
    const bronze = d.tier('bronze');
    const silver = d.tier('silver');
    const tierWidth = silver.maxSr - silver.minSr;
    const divWidth = silver.divisionList[0].maxSr - silver.divisionList[0].minSr;
    const bronzeDiv = bronze.divisionList[0].maxSr - bronze.divisionList[0].minSr;
    const steepest = [...d.divisions].sort((a, b) => b.share - a.share)[0];
    const master3 = d.divisions.find((x) => x.name === 'Master 3');
    const plat5 = d.tier('platinum').divisionList[0];
    return `
<p>Every Overwatch rank covers a band of skill rating, or SR. This page lists the SR range for each tier and each division on the scale this site uses, and pairs each threshold with the estimated share of players below it. If you know roughly where you sit, ${h.chart('the interactive SR distribution chart')} will read out the rank, percentile and distance to the next division at any SR.</p>

<h2>A note on SR in current Overwatch</h2>
<p>The game shows your rank and division, not a public SR number. To measure distances between ranks, this site lays the ladder on a 0 to ${d.sr(d.ladder.maxSr)} SR scale, the same range many players remember from the original game's skill rating. On that scale:</p>
<ul>
  <li>Bronze runs from ${d.sr(bronze.minSr)} to ${d.sr(bronze.maxSr - 1)} SR, ${d.sr(bronze.maxSr - bronze.minSr)} SR wide, with ${d.sr(bronzeDiv)} SR per division.</li>
  <li>Every other tier is ${d.sr(tierWidth)} SR wide, with ${d.sr(divWidth)} SR per division.</li>
  <li>Division 5 is the bottom of a tier and division 1 the top. ${plat5.name} starts at ${d.sr(plat5.minSr)} SR, for example.</li>
  <li>The scale tops out at ${d.sr(d.ladder.maxSr)} SR, the top of Champion 1.</li>
</ul>
<p>Treat these numbers as positions on a ruler rather than values the game reports. They are what lets the site say that Diamond 3 is ${d.sr(d.divisions.find((x) => x.name === 'Diamond 3').minSr - d.divisions.find((x) => x.name === 'Platinum 3').minSr)} SR above Platinum 3, and turn that into a number of players.</p>

<h2>SR ranges for every tier</h2>

${h.tierTable({ caption: 'SR range and estimated percentile for each tier' })}

<h2>The Overwatch SR distribution</h2>
<p>Players are not spread evenly over SR. The estimated distribution for ${d.season.name} is a bell curve centred on about ${d.sr(d.model.params.mean)} SR with a spread (standard deviation) of about ${d.sr(d.model.params.sd)} SR. In plain terms, about ${d.roughPct(d.model.cdf(d.model.params.mean + d.model.params.sd) - d.model.cdf(d.model.params.mean - d.model.params.sd))} of players fall between ${d.sr(d.model.params.mean - d.model.params.sd)} and ${d.sr(d.model.params.mean + d.model.params.sd)} SR, which is ${d.ladder.divisionAt(d.model.params.mean - d.model.params.sd).name} to ${d.ladder.divisionAt(d.model.params.mean + d.model.params.sd).name}.</p>

${h.bell({
  label: `Estimated SR distribution of Overwatch players, ${d.season.name}, from 0 to ${d.sr(d.ladder.maxSr)} SR.`,
  caption: `Estimated SR distribution, ${d.season.name}. Each colour is one tier; the dashed lines mark one standard deviation either side of the mean.`,
  markers: [
    { sr: d.model.params.mean - d.model.params.sd, label: `−1 SD: ${d.sr(d.model.params.mean - d.model.params.sd)}` },
    { sr: d.model.params.mean + d.model.params.sd, label: `+1 SD: ${d.sr(d.model.params.mean + d.model.params.sd)}` },
  ],
})}

<p>The densest division is ${steepest.name} (${steepest.range} SR), with ${d.pct(steepest.share)} of players. Each ${d.sr(divWidth)} SR there moves you past a big slice of the player base. At ${master3.name} (${master3.range} SR) the same ${d.sr(divWidth)} SR covers only ${d.pct(master3.share)} of players. This is why gaining SR near the middle of the ladder changes your percentile a lot, while near the top it barely moves.</p>

${h.estimateNote()}

<h2>SR and percentile for every division</h2>
<p>The table lists each division's SR range, the estimated share of players inside it, and the percentile at the bottom of the division. Use the "Better than" column to answer "what SR do I need to beat X% of players?" and the "Top" column for "what share of players are at this rank or above?"</p>

${h.divisionTable(undefined, { caption: 'SR range and estimated percentile for every division' })}

<h2>How many SR between two ranks?</h2>
<p>Because divisions are a fixed width, the gap between two ranks is easy to count. Outside Bronze it is ${d.sr(divWidth)} SR per division and ${d.sr(tierWidth)} SR per tier. From Gold 5 to Diamond 5 is ${d.sr(d.tier('diamond').minSr - d.tier('gold').minSr)} SR; from Diamond 5 to Master 5 is another ${d.sr(d.tier('master').minSr - d.tier('diamond').minSr)}.</p>
<p>The number of players you pass along the way is not fixed, though. Going from Gold 5 to Diamond 5 passes about ${d.pct(d.tier('diamond').below - d.tier('gold').below)} of all players. Going from Diamond 5 to Master 5, the same kind of jump in tiers, passes ${d.pct(d.tier('master').below - d.tier('diamond').below)}. The compare panel on ${h.chart('the chart')} does this sum for any two ranks you pick.</p>

<h2>Turning an SR into a rank and a percentile</h2>
<p>To place any SR on the ladder, find the tier whose range contains it, then count divisions up from the bottom of that tier: every ${d.sr(divWidth)} SR is one division, so ${d.sr(d.tier('diamond').minSr + 2 * divWidth + 45)} SR is ${d.ladder.divisionAt(d.tier('diamond').minSr + 2 * divWidth + 45).name}. The percentile is the share of players below that SR on the fitted curve; for ${d.sr(d.tier('diamond').minSr + 2 * divWidth + 45)} SR the estimate is ${d.pct(d.model.cdf(d.tier('diamond').minSr + 2 * divWidth + 45))}. The tables on this page give the value at the start of each division; the chart gives it at every SR in between.</p>

<h2>Common questions about SR</h2>
<h3>What SR is Diamond?</h3>
<p>On this scale, Diamond is ${d.tier('diamond').range} SR. Diamond 5 starts at ${d.sr(d.tier('diamond').minSr)} and Diamond 1 at ${d.sr(d.tier('diamond').divisionList.at(-1).minSr)}.</p>
<h3>What SR is Master?</h3>
<p>Master is ${d.tier('master').range} SR. Master 5 starts at ${d.sr(d.tier('master').minSr)}, which the curve puts at the ${d.pct(d.tier('master').below)} mark.</p>
<h3>What SR is Grandmaster and Champion?</h3>
<p>Grandmaster is ${d.tier('grandmaster').range} SR and Champion is ${d.tier('champion').range} SR.</p>
<h3>What is the average SR?</h3>
<p>The median player sits at about ${d.sr(d.median.sr)} SR, in ${d.median.division.name}. See ${h.a('average-rank', 'what the average Overwatch rank is')} for more on that.</p>

${h.cta('Type an SR into the finder on the chart to see the rank, the share of players below and above it, and how far it is to the next division.')}

<p>For a tier-by-tier overview with less arithmetic, read ${h.a('ranks-in-order', 'Overwatch ranks in order')}. For the reverse question, which rank is the top 10% or top 1%, see ${h.a('rank-percentiles', 'Overwatch rank percentiles')}.</p>
`;
  },
};
