export default {
  slug: 'rank-percentiles',
  title: 'Overwatch 2 Rank Percentiles: What Rank Is Top 1%, 10% and 50%?',
  description: (d) =>
    `What rank is top 10% in Overwatch? Estimated rank percentiles for ${d.season.name}: the rank and SR at the top 50%, 25%, 10%, 5%, 1% and 0.1% of players.`,
  keywords: ['overwatch 2 rank percentiles', 'what rank is top 10% in overwatch', 'top 1% overwatch rank', 'overwatch percentile by rank'],
  section: 'Percentiles',
  related: ['rank-percentages', 'average-rank', 'grandmaster-and-champion', 'how-the-estimate-works'],
  body: (d, h) => {
    const top50 = d.topCut(0.5);
    const top25 = d.topCut(0.25);
    const top10 = d.topCut(0.1);
    const top5 = d.topCut(0.05);
    const top1 = d.topCut(0.01);
    const top01 = d.topCut(0.001);
    const bottom10 = d.at(0.1);
    return `
<p>"Top 10%" is a much easier goal to picture than an abstract rank, so this page turns Overwatch rank percentiles around: start from a percentage and find the rank. The numbers are estimates for ${d.season.name} from the same fitted curve used by ${h.chart('the interactive rank distribution chart')}, where the finder's Percent tab does this for any value you type.</p>

<h2>The quick answers</h2>
<ul>
  <li><strong>Top 50%</strong> (better than half of players): ${top50.division.name}, about ${d.sr(top50.sr)} SR.</li>
  <li><strong>Top 25%:</strong> ${top25.division.name}, about ${d.sr(top25.sr)} SR.</li>
  <li><strong>Top 10%:</strong> ${top10.division.name}, about ${d.sr(top10.sr)} SR.</li>
  <li><strong>Top 5%:</strong> ${top5.division.name}, about ${d.sr(top5.sr)} SR.</li>
  <li><strong>Top 1%:</strong> ${top1.division.name}, about ${d.sr(top1.sr)} SR.</li>
  <li><strong>Top 0.1%:</strong> ${top01.division.name}, about ${d.sr(top01.sr)} SR.</li>
</ul>
<p>The SR values are on this site's 0 to ${d.sr(d.ladder.maxSr)} scale, where each division is ${d.widths.division} SR wide (${d.widths.firstDivision} in Bronze). The ${h.a('sr-by-rank', 'SR by rank page')} explains the scale.</p>

${h.estimateNote()}

<h2>What rank is top 10% in Overwatch?</h2>
<p>The top 10% line falls at about ${d.sr(top10.sr)} SR, inside ${top10.division.name}. Anyone in ${top10.division.name} or above is roughly in the top tenth of competitive players; the first division above it, ${d.divisions[top10.division.index + 1]?.name ?? 'the next division'}, is in the top ${d.pct(d.divisions[top10.division.index + 1]?.top ?? top10.division.top)} at its start.</p>
<p>It helps to know how sharply the percentile moves around this point. Moving one division from ${d.divisions[top10.division.index - 1].name} to ${top10.division.name} changes your percentile by about ${d.pct(d.divisions[top10.division.index - 1].share)} of players. That is far less than the same move in the middle of the ladder, so the climb into the top 10% is made up of many small steps.</p>

<h2>What rank is top 1%?</h2>
<p>The top 1% begins at about ${d.sr(top1.sr)} SR, in ${top1.division.name}. That means the top 1% of players is ${top1.tier.id === 'master' ? 'the upper end of Master plus everything above it' : `everything from ${top1.division.name} upward`}. Grandmaster 5, the first Grandmaster division, is already in the top ${d.pct(d.tier('grandmaster').top)}.</p>
<p>The top 0.1%, one player in a thousand, starts around ${d.sr(top01.sr)} SR in ${top01.division.name}. Champion as a whole is ${d.pct(d.tier('champion').top)} of players, about ${d.oneIn(d.tier('champion').top)}. These tail figures are the least certain on the page, because they depend most on the exact shape of the curve far from where the datapoints are. More on that in ${h.a('grandmaster-and-champion', 'how many players are Grandmaster and Champion')}.</p>

<h2>What rank is top 50%?</h2>
<p>The halfway point, the median, is about ${d.sr(top50.sr)} SR in ${top50.division.name}. If you are above that, you are better than more than half of all competitive players. The ${h.a('average-rank', 'average rank page')} looks at the middle of the ladder in more detail.</p>

${h.bell({
  label: `Overwatch rank distribution with the top 50%, 10% and 1% cut-offs marked.`,
  caption: `Where the top 50%, 10% and 1% lines fall on the ${d.season.name} curve.`,
  markers: [
    { sr: top50.sr, label: `Top 50%: ${top50.division.name}` },
    { sr: top10.sr, label: `Top 10%: ${top10.division.name}` },
    { sr: top1.sr, label: `Top 1%: ${top1.division.name}` },
  ],
})}

<h2>Full percentile table</h2>
<p>The table gives the cut-off for a range of "top X%" values. "SR" is the exact point on the curve; the rank column is the division containing it.</p>

${h.cutoffTable([0.75, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05, 0.03, 0.02, 0.01, 0.005, 0.001])}

<h2>The other direction: bottom percentiles</h2>
<p>The same curve answers questions about the bottom of the ladder. The bottom 10% of players are below about ${d.sr(bottom10.sr)} SR, in ${bottom10.division.name} or lower. Gold 5 is better than ${d.pct(d.tier('gold').below)} of players, and Silver 5 better than ${d.pct(d.tier('silver').below)}. Bronze as a whole is only ${d.pct(d.tier('bronze').share)} of players.</p>

<h2>Using percentiles to set a goal</h2>
<p>Percentiles make a good target because they say how many players you would have to outperform. From the median, getting into the top 25% means moving from ${top50.division.name} to ${top25.division.name}, about ${d.sr(top25.sr - top50.sr)} SR on this scale. Getting from the top 25% to the top 10% takes another ${d.sr(top10.sr - top25.sr)} SR, and from the top 10% to the top 1% another ${d.sr(top1.sr - top10.sr)}. Each step halves or more the share of players still ahead of you, and each one needs more SR than the last, which matches how the climb tends to feel.</p>

<h2>Percentile versus share of players</h2>
<p>A percentile counts everyone below you. The share of players in a rank counts only the people inside it. Both come from the same curve but answer different questions. "Diamond is ${d.pct(d.tier('diamond').share)} of players" is a share; "Diamond 5 is better than ${d.pct(d.tier('diamond').below)} of players" is a percentile. For shares by tier and division, see ${h.a('rank-percentages', 'what percentage of players are in each rank')}.</p>

<h2>How reliable are these percentiles?</h2>
<p>Percentiles close to the submitted datapoints are the most reliable, since the curve passes through or close to them. The current season's datapoints are ${h.datapointList()}. Percentiles far from those ranks are filled in by the bell-curve shape, which is a good general model for skill ratings but will not match any season perfectly. As more datapoints are approved, the fit updates and these pages follow on the next build. ${h.a('how-the-estimate-works', 'How the estimate is made')} covers the method.</p>

${h.cta('Switch the finder to Percent, type the share of players you want to beat, and the chart jumps to that rank.')}
`;
  },
};
