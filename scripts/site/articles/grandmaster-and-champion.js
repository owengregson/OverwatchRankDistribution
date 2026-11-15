export default {
  slug: 'grandmaster-and-champion',
  title: 'How Many Players Are Grandmaster and Champion in Overwatch?',
  description: (d) =>
    `What percent of Overwatch players reach Grandmaster and Champion? Estimated at ${d.pct(d.tier('grandmaster').top)} for Grandmaster or higher and ${d.pct(d.tier('champion').top)} for Champion in ${d.season.name}.`,
  keywords: ['how many players are grandmaster overwatch', 'champion rank percentage overwatch', 'what percent of players are grandmaster', 'overwatch top rank percentage'],
  section: 'Rank guides',
  related: ['is-master-good', 'rank-percentiles', 'how-the-estimate-works', 'ranks-in-order'],
  body: (d, h) => {
    const gm = d.tier('grandmaster');
    const champ = d.tier('champion');
    const master = d.tier('master');
    const top01 = d.topCut(0.001);
    const per = (fraction, n) => Math.round(fraction * n).toLocaleString('en-US');
    return `
<p>Grandmaster and Champion are the two highest ranks in Overwatch competitive, and very few players reach them. On the estimate for ${d.season.name}, Grandmaster or higher is about <strong>${d.pct(gm.top)}</strong> of players (${d.oneIn(gm.top)}), and Champion about <strong>${d.pct(champ.top)}</strong> (${d.oneIn(champ.top)}). This page explains those figures, what they mean in practice and why they are the least certain numbers on the site. The top end of the curve is also on ${h.chart('the interactive rank distribution chart')}.</p>

${h.estimateNote()}

<h2>What percent of players are Grandmaster?</h2>
<p>Grandmaster covers ${gm.range} SR on this site's scale and holds an estimated ${d.pct(gm.share)} of players. Reaching Grandmaster 5 means being better than ${d.pct(gm.below)} of the competitive population. Within the tier, the divisions shrink quickly:</p>

${h.divisionTable(['grandmaster', 'champion'], { caption: 'Estimated percentile for each Grandmaster and Champion division' })}

<h2>What percent of players are Champion?</h2>
<p>Champion, the top tier, covers ${champ.range} SR and holds an estimated ${d.pct(champ.share)} of players. That is ${d.oneIn(champ.share)}. Champion 5 is better than ${d.pct(champ.below)} of players, and the top division, Champion 1, holds ${d.pct(champ.divisionList.at(-1).share)}. The one-in-a-thousand line (top 0.1%) falls at about ${d.sr(top01.sr)} SR, in ${top01.division.name}${top01.tier.id === 'grandmaster' ? ', so all of Champion is above it' : ''}.</p>

<h2>So how many players is that?</h2>
<p>Blizzard does not publish player counts for competitive, so this site cannot give an absolute number of Grandmaster or Champion players. What it can do is scale the percentages. For every 10,000 competitive players, the estimate puts about ${per(gm.share, 10000)} in Grandmaster and ${per(champ.share, 10000)} in Champion. For every 100,000, about ${per(gm.share, 100000)} and ${per(champ.share, 100000)}. Multiply by whatever population you believe a region or role has, and keep in mind that each role queue has its own ladder.</p>
<p>Be wary of exact player counts quoted elsewhere for these tiers. Without an official total, any absolute number is a percentage multiplied by a guess, and the guess usually matters more than the percentage.</p>

${h.bars(
  [master, gm, champ].map((t) => ({ name: t.name, color: t.color, share: t.share })),
  {
    label: 'Bar chart comparing the share of players in Master, Grandmaster and Champion.',
    caption: `Share of players in the top three tiers, ${d.season.name}.`,
  },
)}

<h2>What the climb into Grandmaster looks like</h2>
<p>From Master 5 to Grandmaster 5 is ${d.sr(gm.minSr - master.minSr)} SR on this site's scale, five divisions. Along the way you pass ${d.pct(gm.below - master.below)} of all players. For comparison, the single busiest division in the middle of the ladder, ${d.mostCommonDivision.name}, holds ${d.pct(d.mostCommonDivision.share)} on its own${gm.below - master.below < d.mostCommonDivision.share ? ', more than the whole of Master' : ''}. Each step takes about as much SR as anywhere else, yet the number of people you pass keeps shrinking, because there are so few of them left.</p>
<p>Inside Grandmaster the same pattern continues. Grandmaster 5 holds ${d.pct(gm.divisionList[0].share)} of players and Grandmaster 1 holds ${d.pct(gm.divisionList.at(-1).share)}. In Champion, no division holds more than ${d.pct(Math.max(...champ.divisionList.map((x) => x.share)))} of players, which is why small changes in the fitted curve can move these numbers noticeably.</p>

<h2>How rare is it compared with Master?</h2>
<p>Master holds ${d.pct(master.share)} of players, which is about ${Math.round(master.share / gm.share)} times as many as Grandmaster and about ${Math.round(master.share / champ.share)} times as many as Champion. The ladder narrows sharply at the top because these tiers sit far out on the tail of the bell curve, where every extra ${d.widths.division} SR leaves fewer and fewer players. Read ${h.a('is-master-good', 'is Master good')} for the tier below.</p>

<h2>Why these numbers are the least certain</h2>
<p>The curve on this site is fitted to community-submitted datapoints. In ${d.season.name} those are ${h.datapointList()}. ${d.datapoints.some((p) => p.sr >= gm.minSr) ? 'Only a few of them are in Grandmaster or Champion, so the top tiers still lean on the bell-curve shape' : 'None of them are in Grandmaster or Champion, so those tiers are filled in from the bell-curve shape'}, and the far tail is exactly where small differences in the shape matter most. Two things can push the real figures away from the estimate:</p>
<ul>
  <li><strong>The real tail may be heavier or lighter.</strong> A normal curve drops off at a fixed rate. If real ratings have a slightly fatter tail, there would be more Grandmaster and Champion players than estimated; a thinner one, fewer.</li>
  <li><strong>The top of the ladder is capped.</strong> The SR scale stops at ${d.sr(d.ladder.maxSr)}. The fit accounts for this by renormalising the curve over 0 to ${d.sr(d.ladder.maxSr)}, but how the game handles its very best players is not something a bell curve captures exactly.</li>
</ul>
<p>Datapoints from Grandmaster or Champion players are the most useful thing for tightening these figures. When submissions are open on the site, each one is checked against its screenshot before it counts. ${h.a('how-the-estimate-works', 'How the estimate is made')} covers the method in full.</p>

<h2>Grandmaster, Champion and Top 500</h2>
<p>Overwatch also has Top 500 leaderboards, which list the highest-rated players by region and role. Those are a fixed number of players rather than a percentage, and this site does not model them. The tier percentages here describe everyone in each rank, not leaderboard placement.</p>

${h.cta('Move to the far right of the curve on the chart to read the percentile at each Grandmaster and Champion division.')}

<p>For the cut-offs below the top tiers, like top 10% and top 5%, see ${h.a('rank-percentiles', 'Overwatch rank percentiles')}. For an overview of every tier, read ${h.a('ranks-in-order', 'Overwatch ranks in order')}.</p>
`;
  },
};
