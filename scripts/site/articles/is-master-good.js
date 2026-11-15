export default {
  slug: 'is-master-good',
  title: 'Is Master Good in Overwatch? Master Rank Percentile',
  description: (d) =>
    `Is Master a good rank in Overwatch? Master 5 is better than an estimated ${d.pct(d.tier('master').below)} of players in ${d.season.name}. Percentiles for every Master division.`,
  keywords: ['is master good overwatch', 'is masters good in overwatch 2', 'master rank percentage overwatch', 'overwatch master top percent'],
  section: 'Rank guides',
  related: ['is-diamond-good', 'grandmaster-and-champion', 'rank-percentiles', 'how-the-estimate-works'],
  body: (d, h) => {
    const t = d.tier('master');
    const [m5] = t.divisionList;
    const m1 = t.divisionList.at(-1);
    const diamond = d.tier('diamond');
    const gm = d.tier('grandmaster');
    const top5 = d.topCut(0.05);
    const top1 = d.topCut(0.01);
    return `
<p>Yes. Master is a high rank by any measure. On the ${d.season.name} estimate, Master 5 is better than about <strong>${d.pct(t.below)}</strong> of competitive players, and Master or higher is roughly ${d.oneIn(t.top)} players. This page breaks the tier down by division and compares it with Diamond below and Grandmaster above. The same figures are on ${h.chart('the interactive Overwatch rank chart')}, where you can compare Master with any other rank.</p>

${h.estimateNote()}

<h2>What percent of players are Master?</h2>
<p>About ${d.pct(t.share)} of players are in Master, the tier from ${t.range} SR on this site's scale. Master or higher, including Grandmaster and Champion, is ${d.pct(t.top)}.</p>

${h.curve({
  label: 'Overwatch rank distribution with the Master tier highlighted.',
  caption: `Master on the ${d.season.name} curve, with the top 5% and top 1% lines.`,
  markers: [
    { sr: top5.sr, label: `Top 5%: ${top5.division.name}` },
    { sr: top1.sr, label: `Top 1%: ${top1.division.name}` },
  ],
  shade: [t.minSr, t.maxSr],
})}

<h2>Master percentile by division</h2>

${h.divisionTable(['master'], { caption: 'Estimated percentile for each Master division' })}

<p>Through Master the curve is flattening out. Master 5 holds ${d.pct(m5.share)} of players and Master 1 only ${d.pct(m1.share)}. Climbing one division here passes at most ${d.pct(m5.share)} of the player base, compared with ${d.pct(d.mostCommonDivision.share)} for a division near the middle of the ladder such as ${d.mostCommonDivision.name}.</p>

<h2>Is Master top 5%? Is it top 1%?</h2>
<p>The top 5% line falls at about ${d.sr(top5.sr)} SR, in ${top5.division.name}, so ${top5.tier.id === 'master' ? `most of Master is inside the top 5%` : `the top 5% starts in ${top5.tier.name}`}. The top 1% begins around ${d.sr(top1.sr)} SR in ${top1.division.name}${top1.tier.id === 'master' ? ', so only the highest Master division or two reach it' : ''}. Grandmaster 5 is in the top ${d.pct(gm.top)}. For a full list of cut-offs see ${h.a('rank-percentiles', 'what rank is top 10% and top 1%')}.</p>

<h2>Master compared with Diamond and Grandmaster</h2>
<ul>
  <li><strong>Diamond</strong> holds ${d.pct(diamond.share)} of players. Diamond 1 is better than ${d.pct(diamond.divisionList.at(-1).below)}.</li>
  <li><strong>Master</strong> holds ${d.pct(t.share)}, from ${d.pct(t.below)} at Master 5 to ${d.pct(m1.below)} at Master 1.</li>
  <li><strong>Grandmaster</strong> holds ${d.pct(gm.share)}, and Grandmaster 5 is better than ${d.pct(gm.below)}.</li>
</ul>
<p>There are about ${ratio(diamond.share, t.share)} times as many Diamond players as Master players, and about ${ratio(t.share, gm.share)} times as many Master players as Grandmaster players. Each step up the top of the ladder thins the field sharply. The ${h.a('grandmaster-and-champion', 'Grandmaster and Champion page')} continues from here.</p>

<h2>From Diamond to Master in numbers</h2>
<p>On this site's scale, Master 5 is ${d.sr(t.minSr - diamond.minSr)} SR above Diamond 5, the same width as any other tier. In players, though, the climb from Diamond 5 to Master 5 passes ${d.pct(t.below - diamond.below)} of the player base, and the last step, from Diamond 1 to Master 5, passes ${d.pct(diamond.divisionList.at(-1).share)}. By the time you reach Master you have already passed nearly everyone you will ever pass: only ${d.pct(t.top)} of players are left above you.</p>
<p>That is a useful way to set expectations. A Diamond player who reaches Master has made a jump that matters on paper. A Master player who climbs a division gains very little percentile, but that division is among the hardest on the ladder to earn, because the remaining opponents are the strongest in the game.</p>

<h2>Why Master feels hard to climb</h2>
<p>The numbers explain a familiar feeling. On this site's scale every division is ${d.widths.division} SR wide, but in Master each one holds a small and shrinking slice of players, and those players are near the top of the skill range. Gaining a division means beating opponents who are, by definition, rarer and stronger than in any tier below. A Master player who climbs from Master 5 to Master 1 passes ${d.pct(m1.below - t.below)} of players; a Gold player who climbs from Gold 5 to Gold 1 passes ${d.pct(d.tier('gold').divisionList.at(-1).below - d.tier('gold').below)}.</p>

<h2>Master on different roles</h2>
<p>Because Overwatch ranks each role separately, it is common to be Master on one role and a tier or two lower on another. That is not a sign that one rank is wrong. Each role is a different job with its own pool of players, and most people put more of their games into one of them. When you quote your rank, the role it belongs to is part of the answer, and the percentile here is best read as a guide for the role you play most.</p>

<h2>So, is Master good?</h2>
<p>Master is a very good rank. It is roughly the top ${d.roughPct(t.top)} of competitive players at its start, and it is the tier where the game's top end begins: above it there are only Grandmaster and Champion, which together hold ${d.pct(gm.top)} of players. Overwatch keeps a separate rank for each role, and this site shows a single combined curve, so a Master rank on your best role sits on its own ladder.</p>

${h.cta('Pin Master on the chart and compare it with your rank to see the gap in SR, divisions and players.')}

<p>Looking down a tier instead? Read ${h.a('is-diamond-good', 'is Diamond good')}. Curious how much to trust these numbers? ${h.a('how-the-estimate-works', 'How the estimate is made')} explains the fit.</p>
`;
  },
};

const ratio = (a, b) => {
  const r = a / b;
  return r >= 10 ? Math.round(r).toString() : r.toFixed(1).replace(/\.0$/, '');
};
