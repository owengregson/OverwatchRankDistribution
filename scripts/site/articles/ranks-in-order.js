const NOTES = {
  bronze: (d, t) =>
    `Bronze is the first tier and the widest on this site's scale. It is also one of the smallest by population: the curve puts only ${d.pct(t.share)} of players here, so the bottom of the ladder is about as thin as the very top.`,
  silver: (d, t) =>
    `Silver holds ${d.pct(t.share)} of players. Reaching Silver 5 already puts you ahead of ${d.pct(t.below)} of the player base, and each division climbed in Silver passes a growing number of people as you approach the middle of the curve.`,
  gold: (d, t) =>
    `Gold is where the curve starts to rise steeply. It holds ${d.pct(t.share)} of players, and Gold 1 is better than ${d.pct(t.divisionList.at(-1).below)} of them. Climbing through Gold passes more players per division than anywhere below it.`,
  platinum: (d, t) =>
    `Platinum is one of the two biggest tiers, with ${d.pct(t.share)} of players. It runs from the ${ordinalPct(d, t.below)} percentile at Platinum 5 to the ${ordinalPct(d, t.divisionList.at(-1).below)} at Platinum 1.`,
  emerald: (d, t) =>
    `Emerald sits between Platinum and Diamond and holds ${d.pct(t.share)} of players${d.mostCommonTier.id === 'emerald' ? ', more than any other tier' : ''}. ${d.median.tier.id === 'emerald' ? `The median player, ${d.median.division.name}, is here.` : ''}`,
  diamond: (d, t) =>
    `Diamond holds ${d.pct(t.share)} of players. Diamond 5 is better than ${d.pct(t.below)} of players, so ${t.below > 0.5 ? 'the whole tier is above the median' : 'Diamond starts near the middle of the ladder'}. Diamond or higher is about ${d.roughPct(t.top)} of players.`,
  master: (d, t) =>
    `Master holds ${d.pct(t.share)} of players, and Master 5 is better than ${d.pct(t.below)} of them. It is the tier where the curve has flattened out: each division passes a smaller and smaller slice of the player base.`,
  grandmaster: (d, t) =>
    `Grandmaster is ${d.pct(t.share)} of players, about ${d.oneIn(t.top)} once you include Champion above it. Grandmaster 5 is better than ${d.pct(t.below)} of players.`,
  champion: (d, t) =>
    `Champion is the top tier, with an estimated ${d.pct(t.share)} of players, about ${d.oneIn(t.share)}. Champion 5 is better than ${d.pct(t.below)} of players. At this end of the curve the estimate rests heavily on the bell-curve shape, so treat the exact figure with care.`,
};

/** 0.1451 → "15th" */
function ordinalPct(d, fraction) {
  const n = Math.round(fraction * 100);
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

export default {
  slug: 'ranks-in-order',
  title: 'Overwatch Ranks in Order: Bronze to Champion Tier Guide',
  description: (d) =>
    `All ${d.tiers.length} Overwatch ranks in order from Bronze to Champion, with each tier's divisions, SR range and estimated share of players in ${d.season.name}.`,
  keywords: ['overwatch ranks in order', 'overwatch rank tiers', 'overwatch ranks list', 'bronze to champion'],
  section: 'Ranks and SR',
  related: ['sr-by-rank', 'rank-percentages', 'is-diamond-good', 'grandmaster-and-champion'],
  body: (d, h) => {
    const order = d.tiers.map((t) => t.name).join(', ');
    return `
<p>Overwatch competitive has ${d.tiers.length} ranks, or tiers. In order from lowest to highest they are: ${order}. Each tier has ${d.ladder.divisionsPerTier} divisions, from ${d.ladder.divisionsPerTier} at the bottom to 1 at the top, which makes ${d.divisions.length} divisions in all. This guide goes through every tier with its SR range on this site's scale and the estimated share of players in it for ${d.season.name}. To see them on the curve, open ${h.chart('the interactive rank chart')}.</p>

<h2>All Overwatch ranks at a glance</h2>
<ol class="tier-list">
${d.tiers
  .map(
    (t) =>
      `  <li style="--c:${t.color}"><strong>${t.name}</strong> <span>${t.range} SR</span> <span>${d.pct(t.share)} of players</span></li>`,
  )
  .join('\n')}
</ol>

${h.estimateNote()}

<h2>How divisions work</h2>
<p>Inside each tier, division 5 is the entry point and division 1 the last step before the next tier. So the climb from Gold to Platinum goes Gold 5, Gold 4, Gold 3, Gold 2, Gold 1, then Platinum 5. On this site's scale a division is ${d.sr(d.tier('silver').divisionList[0].maxSr - d.tier('silver').minSr)} SR wide, except in Bronze where it is ${d.sr(d.tier('bronze').divisionList[0].maxSr)}, so a tier spans ${d.sr(d.tier('silver').maxSr - d.tier('silver').minSr)} SR (Bronze ${d.sr(d.tier('bronze').maxSr)}). The game shows your rank and division rather than an SR number; the scale is what lets the site measure the distance between ranks. See ${h.a('sr-by-rank', 'SR by rank')} for every division's range.</p>

<h2>Every tier, lowest to highest</h2>
${d.tiers
  .map(
    (t) => `<h3>${h.tierName(t)}</h3>
<p class="facts">${t.range} SR · ${d.pct(t.share)} of players · better than ${d.pct(t.below)} at ${t.name} ${d.ladder.divisionsPerTier}</p>
<p>${NOTES[t.id]?.(d, t) ?? ''}</p>`,
  )
  .join('\n\n')}

<h2>The tiers by share of players</h2>
<p>Ordered by size instead of skill, the ladder looks very different. ${d.tiersByShare
      .slice(0, 3)
      .map((t) => t.name)
      .join(', ')} are the three biggest tiers. The smallest are ${d.tiersByShare
      .slice(-3)
      .map((t) => t.name)
      .join(', ')}: because the curve is a bell, the thinly populated tiers sit at the two ends of the ladder.</p>

${h.tierBars({
  label: 'Bar chart of the estimated share of players in each Overwatch tier, Bronze to Champion.',
  caption: `Estimated share of players in each tier, ${d.season.name}, in ladder order.`,
})}

<h2>Which rank is "good"?</h2>
<p>That depends on what you compare with. Against the whole player base, anything above ${d.median.division.name} is above average. Diamond 5 is better than ${d.pct(d.tier('diamond').below)} of players and Master 5 better than ${d.pct(d.tier('master').below)}. There are separate pages on ${h.a('is-diamond-good', 'whether Diamond is good')}, ${h.a('is-master-good', 'whether Master is good')}, and ${h.a('grandmaster-and-champion', 'how rare Grandmaster and Champion are')}.</p>

<h2>Ranks per role</h2>
<p>Overwatch tracks a separate rank for each role you queue as, so one player can be Platinum on tank and Diamond on support. Each role has its own population, and their distributions are not exactly the same. This site fits one curve per season and does not split by role, so the numbers here describe competitive players in general.</p>

${h.cta('Hover over any tier on the chart to see its share of players, its SR range and the percentile at each division.')}

<p>For the full division-by-division table, see ${h.a('rank-percentages', 'what percentage of players are in each rank')}, or start from a target with ${h.a('rank-percentiles', 'what rank is top 10% and top 1%')}.</p>
`;
  },
};
