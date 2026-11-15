import { cdf, probit } from '../../../src/lib/math/normal.js';

export default {
  slug: 'how-the-estimate-works',
  title: 'How the Overwatch Rank Percentiles Are Estimated',
  description: (d) =>
    `How this site estimates the Overwatch rank distribution: community datapoints, a normal (bell curve) fit in z-score space, the 0–${d.sr(d.ladder.maxSr)} SR range, and the limits of the method.`,
  keywords: ['overwatch rank distribution methodology', 'how are overwatch rank percentiles calculated', 'overwatch rank normal distribution', 'overwatch rank bell curve'],
  section: 'Methodology',
  related: ['overwatch-rank-distribution', 'rank-distribution-by-season', 'grandmaster-and-champion', 'faq'],
  body: (d, h) => {
    const pts = d.datapoints;
    const { mean, sd } = d.model.params;
    const fmtZ = (z) => z.toFixed(3);
    const exact = pts.length === 2;
    const example = pts[0];
    const outside = cdf((d.ladder.minSr - mean) / sd) + 1 - cdf((d.ladder.maxSr - mean) / sd);
    return `
<p>Every percentage on this site, from the share of Diamond players to the rank that marks the top 1%, comes from one fitted curve per season. This page explains exactly how that curve is made: what goes in, the maths that turns a handful of datapoints into a full Overwatch rank distribution, and where the method is strong or weak. The code is open, and the same functions drive ${h.chart('the interactive chart')} and these articles.</p>

<h2>Step 1: datapoints</h2>
<p>A datapoint is a single observation of the form "a player at this rank is better than X% of players". Players submit them with a screenshot showing the percentage, and each one is checked against its screenshot before it counts. A datapoint can be tied to a rank (it then means the first SR of that division) or to an exact SR. Trusted datapoints can be given extra weight.</p>
<p>The current season, ${d.season.name}, has ${pts.length} approved datapoint${pts.length === 1 ? '' : 's'}:</p>
<div class="table-wrap panel"><table>
  <caption>Datapoints behind the ${d.season.name} curve</caption>
  <thead><tr><th scope="col">Datapoint</th><th scope="col">SR</th><th scope="col">Better than</th><th scope="col">Weight</th><th scope="col">z-score</th><th scope="col">Curve says</th></tr></thead>
  <tbody>
${pts
  .map(
    (p) =>
      `    <tr><th scope="row">${p.label}</th><td>${d.sr(p.sr)}</td><td>${d.pct(p.p)}</td><td>${p.weight}</td><td>${fmtZ(probit(p.p))}</td><td>${d.pct(p.fitted)}</td></tr>`,
  )
  .join('\n')}
  </tbody>
</table></div>
<p>These are community figures, not numbers published by Blizzard. Blizzard does not release a full rank distribution, which is the gap this site tries to fill.</p>

<h2>Step 2: assume a bell curve</h2>
<p>Skill ratings across a large population are well described by a normal distribution, the familiar bell curve. The site assumes each season's ratings follow one, which leaves two unknowns: the centre (mean) and the spread (standard deviation). Two datapoints are enough to pin both down; more datapoints let the fit average out errors.</p>

<h2>Step 3: fit a straight line in z-score space</h2>
<p>A normal distribution has a useful property. Convert each "better than" percentage into a z-score, the number of standard deviations above the average that percentage corresponds to, and the datapoints fall on a straight line against SR:</p>
<p class="formula">z = (SR − mean) / standard deviation</p>
<p>For example, ${example.label} is better than ${d.pct(example.p)} of players, which is a z-score of ${fmtZ(probit(example.p))}. With every datapoint converted, the fit is a weighted least-squares straight line through the points (SR, z). The slope gives the standard deviation (one over the slope) and the intercept gives the mean. ${exact ? 'With exactly two datapoints, the line passes through both and the curve matches them exactly, which is why the "curve says" column above equals the submitted figures.' : `With more than two datapoints the line is a best fit; the root-mean-square difference between the curve and the datapoints is ${d.pct(d.model.rmse)}.`}</p>

<h2>Step 4: keep the curve inside 0 to ${d.sr(d.ladder.maxSr)} SR</h2>
<p>On this site's scale, SR cannot go below 0 or above ${d.sr(d.ladder.maxSr)}. A raw bell curve has tails that run forever, so the fitted curve is truncated to that range and renormalised so that it still adds up to 100% of players. The fit then repeats a few times, adjusting the line so that it is the truncated curve, not the unbounded one, that matches the datapoints. For the current season, an unbounded curve would put ${d.pct(outside)} of players outside the range, so the correction is ${outside < 0.001 ? 'tiny, but it keeps the maths honest for seasons where it would matter' : 'small but worth making'}.</p>

<h2>The result for ${d.season.name}</h2>
<p>The fitted curve has a mean of about ${d.sr(mean)} SR and a standard deviation of about ${d.sr(sd)} SR. Everything else follows from it:</p>
<ul>
  <li>The share of players in a tier or division is the area under the curve between its first and last SR.</li>
  <li>The percentile of a rank is the area to the left of its first SR.</li>
  <li>The rank for "top X%" is found by running the curve backwards (the quantile function) to get the SR, then looking up the division at that SR.</li>
</ul>

${h.bell({
  label: `Fitted ${d.season.name} curve with the datapoints marked.`,
  caption: `The fitted ${d.season.name} curve. Dashed lines mark the datapoints it was fitted to.`,
  markers: pts.map((p) => ({ sr: p.sr, label: `${p.label}: ${d.pct(p.p)}` })),
})}

<h2>Where the estimate is strong</h2>
<p>Near the datapoints, the curve is pinned by real figures, so the percentiles there are as good as the submissions. Between datapoints, the bell shape interpolates smoothly, which works well when the points are spread across the ladder. The ladder positions themselves are fixed, so a rank's percentile is always measured in the same place.</p>

<h2>Where it is weak</h2>
<p><strong>Far from the datapoints.</strong> ${pts.length ? `The current datapoints are at ${h.datapointList()}. Ranks far from them, both at the bottom of the ladder and at the very top, are filled in by the bell shape rather than by measurements.` : ''} If the real distribution is skewed or has heavier tails than a normal curve, the estimates there will be off.</p>
<p><strong>Few datapoints.</strong> With only two datapoints the curve fits them exactly, which means any error in either one passes straight into every other number. Each additional datapoint, especially one far from the existing ones, makes the fit more robust.</p>
<p><strong>One curve for all roles.</strong> Overwatch keeps a separate rank for each role. The site fits one curve per season, so it describes competitive players as a whole rather than any one role queue.</p>
<p><strong>Not official.</strong> This is an unofficial fan project, not affiliated with Blizzard Entertainment, and the figures are estimates. Treat them as a well-reasoned approximation rather than a census.</p>

<h2>Can other curve shapes be used?</h2>
<p>Yes. Each season names the model it uses, and the normal fit is the default. A different shape, for example one that allows a skewed distribution, can be added with the same inputs and outputs, and a season can switch to it once there are enough datapoints to justify the extra flexibility. See ${h.a('rank-distribution-by-season', 'the rank distribution by season')} for the seasons fitted so far.</p>

${h.cta('Open the chart to see the fitted curve full size; the readout updates as you move across it.')}

<p>Questions about the data? The ${h.a('faq', 'FAQ')} covers the common ones. For the results of the fit, start with ${h.a('overwatch-rank-distribution', 'the Overwatch rank distribution explained')}.</p>
`;
  },
};
