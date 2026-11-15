export default {
  slug: 'is-diamond-good',
  title: 'Is Diamond Good in Overwatch? Diamond Rank Percentile',
  description: (d) =>
    `Is Diamond a good rank in Overwatch? Diamond 5 is better than an estimated ${d.pct(d.tier('diamond').below)} of players in ${d.season.name}. See every Diamond division's percentile.`,
  keywords: ['is diamond good overwatch', 'what percent of players are diamond', 'diamond rank percentile overwatch', 'overwatch diamond top percent'],
  section: 'Rank guides',
  related: ['is-master-good', 'rank-percentages', 'average-rank', 'ranks-in-order'],
  body: (d, h) => {
    const t = d.tier('diamond');
    const [d5] = t.divisionList;
    const d1 = t.divisionList.at(-1);
    const emerald = d.tier('emerald');
    const master = d.tier('master');
    const aboveMedian = t.below > 0.5;
    return `
<p>Short answer: ${aboveMedian ? 'yes' : 'it is around the middle'}. On the estimate for ${d.season.name}, reaching Diamond 5 puts you ahead of about <strong>${d.pct(t.below)}</strong> of competitive Overwatch players, and Diamond or higher is only about ${d.roughPct(t.top)} of the player base. Whether it feels good depends on what you compare it with, so this page lays out where Diamond sits on the ladder, division by division. You can check the same numbers on ${h.chart('the interactive rank distribution chart')}.</p>

${h.estimateNote()}

<h2>What percent of players are Diamond?</h2>
<p>About ${d.pct(t.share)} of players are in Diamond, which covers ${t.range} SR on this site's scale. The tier is busiest at the bottom: Diamond 5 alone holds ${d.pct(d5.share)} of players, while Diamond 1 holds ${d.pct(d1.share)}. That shape is what you would expect from a bell curve: Diamond sits on the downward slope past the peak, so each division up has fewer players than the one below.</p>

${h.curve({
  label: 'Overwatch rank distribution with the Diamond tier highlighted.',
  caption: `Diamond on the ${d.season.name} curve. Everything to the right of Diamond 5 is about ${d.roughPct(t.top)} of players.`,
  markers: [{ sr: t.minSr, label: `Diamond 5: top ${d.pct(t.top)}` }],
  shade: [t.minSr, t.maxSr],
})}

<h2>Diamond percentile by division</h2>
<p>Here is where every Diamond division starts, on the curve:</p>

${h.divisionTable(['diamond'], { caption: 'Estimated percentile for each Diamond division' })}

<p>Moving from Diamond 5 to Diamond 1 takes you from the ${pctWord(t.below)} to the ${pctWord(d1.below)}. Climbing out the top of the tier into Master 5 puts you ahead of ${d.pct(master.below)}.</p>

<h2>Is Diamond above average?</h2>
<p>${aboveMedian ? `Yes, clearly. The median player is in ${d.median.division.name}, so even the lowest Diamond division is above the halfway mark. Diamond 5 sits about ${d.sr(t.minSr - d.median.sr)} SR above the median on this site's scale.` : `Diamond 5 is close to the middle of the ladder, near the median player in ${d.median.division.name}.`} Most of the player base is below Diamond: Bronze through Emerald together hold ${d.pct(t.below)} of players.</p>
<p>Among people who follow the game closely, Diamond can feel ordinary. Content creators, coaches and the players in guide videos are mostly Master and above, and matchmaking means a Diamond player mostly plays with other Diamond players. Neither changes the population figures: about ${d.roughPct(t.below)} of players are below Diamond 5.</p>

<h2>Diamond compared with nearby ranks</h2>
<ul>
  <li><strong>Emerald</strong> (the tier below) holds ${d.pct(emerald.share)} of players${d.mostCommonTier.id === 'emerald' ? ', the most of any tier' : ''}. Emerald 1 is better than ${d.pct(emerald.divisionList.at(-1).below)} of players.</li>
  <li><strong>Diamond</strong> holds ${d.pct(t.share)}, from the ${pctWord(t.below)} to the ${pctWord(t.below + t.share)}.</li>
  <li><strong>Master</strong> (the tier above) holds ${d.pct(master.share)}, and Master 5 is better than ${d.pct(master.below)} of players. See ${h.a('is-master-good', 'is Master good')}.</li>
</ul>
<p>The jump from Emerald 5 to Diamond 5 passes ${d.pct(t.below - emerald.below)} of all players. The same five-division jump from Diamond 5 to Master 5 passes ${d.pct(master.below - t.below)}. That difference is one reason climbing can feel slower from Diamond upward: each division is still ${d.sr(d.widths.division)} SR, but there are fewer players to pass and the ones left are stronger.</p>

<h2>How far is Diamond from Platinum and Emerald?</h2>
<p>On this site's scale, Diamond 5 is ${d.sr(t.minSr - d.tier('platinum').minSr)} SR above Platinum 5 and ${d.sr(t.minSr - emerald.minSr)} SR above Emerald 5. In players, the climb from Platinum 5 to Diamond 5 passes ${d.pct(t.below - d.tier('platinum').below)} of the whole player base, and the climb from Emerald 5 passes ${d.pct(t.below - emerald.below)}. Those are the busiest stretches of the ladder, so this is where a good run of games moves your percentile the most.</p>
<p>Within Diamond the gaps shrink. Going from Diamond 5 to Diamond 1 takes ${d.sr(d1.minSr - t.minSr)} SR and passes ${d.pct(d1.below - t.below)} of players. If you are in Diamond 5 and wondering how much better a Diamond 1 player is, the honest answer is: better than an extra ${d.roughPct(d1.below - t.below)} of the population, a meaningful gap but a smaller one than the jump into Diamond in the first place.</p>

<h2>What does it take to reach Diamond?</h2>
<p>On the numbers, reaching Diamond means outplaying about ${d.roughPct(t.below)} of the competitive population. That is a real achievement in a game with a large player base. Overwatch also keeps a separate rank for each role, so a Diamond rank on one role does not mean the same on the others; each role's ladder has its own population. This site shows one combined curve.</p>

<h2>So, is Diamond good?</h2>
<p>Measured against all competitive players, Diamond is a good rank: it is in the top ${d.roughPct(t.top)} at its start and the top ${d.pct(d1.top)} at Diamond 1. Measured against the very top of the ladder it is a stepping stone, since Master, Grandmaster and Champion still lie ahead. Both are true, and the percentile is the more honest way to describe it.</p>

${h.cta('Pick Diamond in the finder on the chart to see the percentile at each division, or pin it and compare it with your current rank.')}

<p>For a full list of every rank's share, read ${h.a('rank-percentages', 'what percentage of players are in each rank')}. For where the middle of the ladder is, see ${h.a('average-rank', 'the average Overwatch rank')}.</p>
`;
  },
};

/** 0.7488 → "75th percentile" */
function pctWord(fraction) {
  const n = Math.min(99, Math.round(fraction * 100));
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix} percentile`;
}
