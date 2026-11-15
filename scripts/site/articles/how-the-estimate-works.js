import { cdf, probit } from '../../../src/lib/math/normal.js';

export default {
  slug: 'how-the-estimate-works',
  title: 'How the Overwatch Rank Percentiles Are Estimated',
  description: (d) =>
    `How this site estimates the Overwatch rank distribution: datapoints, a curve fitted in z-score space (a bell curve, or one that follows the data), the 0–${d.sr(d.ladder.maxSr)} SR range, and the limits of the method.`,
  keywords: ['overwatch rank distribution methodology', 'how are overwatch rank percentiles calculated', 'overwatch rank normal distribution', 'overwatch rank bell curve'],
  section: 'Methodology',
  related: ['overwatch-rank-distribution', 'rank-distribution-by-season', 'grandmaster-and-champion', 'faq'],
  body: (d, h) => {
    const { mean, sd } = d.model;
    const bell = d.isBellFit;
    const fmtZ = (z) => z.toFixed(3);
    /** A round figure to show the conversion with: not one of the site's own. */
    const example = 0.9;
    const maxSr = d.sr(d.ladder.maxSr);
    // Share of players the curve would put outside the SR range if it had no ends.
    const outside = bell
      ? cdf((d.ladder.minSr - d.model.params.mean) / d.model.params.sd) +
        1 -
        cdf((d.ladder.maxSr - d.model.params.mean) / d.model.params.sd)
      : d.model.params.floorShare + d.model.params.ceilingShare;
    const bySeason = [...d.seasons].reverse();
    const lowest = d.divisions[0];
    return `
<p>Every percentage on this site, from the share of Diamond players to the rank that marks the top 1%, comes from one fitted curve per season. This page explains exactly how that curve is made: what goes in, the maths that turns datapoints into a full Overwatch rank distribution, and where the method is strong or weak. The code is open, and the same functions drive ${h.chart('the interactive chart')} and these articles.</p>

<h2>Step 1: datapoints</h2>
<p>A datapoint is a single observation of the form "a player at this rank is better than X% of players". Players submit them with a screenshot showing the percentage, and each one is checked against its screenshot before it counts. A season can also be entered from a published breakdown of the whole ladder, in which case there is a datapoint at every tier or division boundary. A datapoint can be tied to a rank (it then means the first SR of that division) or to an exact SR.</p>
<p>These are community figures, not numbers published by Blizzard. Blizzard does not release a full rank distribution for every season, which is the gap this site tries to fill.</p>

<h2>Step 2: z-scores</h2>
<p>Skill ratings across a large population are well described by a normal distribution, the familiar bell curve. A bell curve has a useful property. Convert each "better than" percentage into a z-score, the number of standard deviations above the average that percentage corresponds to, and the datapoints fall on a straight line against SR:</p>
<p class="formula">z = (SR − mean) / standard deviation</p>
<p>For example, a rank that is better than ${d.pct(example)} of players has a z-score of ${fmtZ(probit(example))}. Every curve on this site is built from datapoints converted this way. What differs from season to season is the line drawn through them.</p>

<h2>Step 3: draw the curve</h2>
<p>A season uses one of two kinds of curve, depending on how much is known about it. ${d.season.name} uses the ${bell ? 'first' : 'second'}.</p>
<h3>Bell curve: for a few community datapoints</h3>
<p>When a season has a handful of datapoints, often close together and a little noisy, the site assumes the distribution is a bell curve and looks for the one closest to the data. That leaves two unknowns, the centre (mean) and the spread (standard deviation), and the fit is a weighted least-squares straight line through the points (SR, z). The slope gives the standard deviation (one over the slope) and the intercept gives the mean. Trusted datapoints can be given extra weight. With exactly two datapoints the line passes through both; with more it is a best fit, which averages out their errors.</p>
<h3>Following the data: for a season known across the ladder</h3>
<p>Real distributions are only roughly bell-shaped. They can lean to one side, have a flatter top, or carry more players in the top tiers than a bell allows. When a season has datapoints right across the ladder, the site stops assuming a bell and draws a smooth, always-rising curve through every point in z-score space. Where the points lie on a straight line, the result is a bell curve; where they bend, the curve bends with them. Past the outermost datapoints it carries straight on, so the far ends are still a bell curve's tails. With only two datapoints the two methods give the same curve.</p>
<p>On this site's SR scale Bronze divisions are wider than the rest (${d.sr(d.widths.firstDivision)} SR against ${d.sr(d.widths.division)}), so where a season has datapoints inside Bronze, the same players are spread over more SR there and the curve climbs quickly across the Bronze boundary.</p>
<h3>The top 1%: a bell tail, whichever curve it is</h3>
<p>The game's "higher ranked than" figure is a whole percent and stops at 99, so it cannot tell one player in the top 1% from another. Neither kind of curve is fitted past that point. The lowest datapoint at 99% or more marks where the top 1% begins. Datapoints above it are kept on record but not used, and from the mark upwards the curve is the bell tail that carries on from the datapoints below it.</p>

<h2>Step 4: keep the curve inside 0 to ${maxSr} SR</h2>
<p>On this site's scale, SR cannot go below 0 or above ${maxSr}, but a bell curve's tails run on forever. The two kinds of curve deal with that differently.</p>
<ul>
  <li><strong>Bell curve.</strong> The curve is cut off at both ends and scaled back up so that it still adds up to 100% of players. The fit then repeats a few times, so that it is the cut-off curve, not the endless one, that matches the datapoints.</li>
  <li><strong>Following the data.</strong> Players the curve would put below 0 SR are counted in the lowest division, ${lowest.name}, which is where the game puts everyone below it; the same goes for the top division at the other end. This is why ${lowest.name} can hold more players than the division above it, something a plain bell curve cannot show.</li>
</ul>
<p>For the current season, an endless curve would put ${d.pct(outside)} of players outside the range${outside < 0.001 ? ', so the correction is tiny here' : ''}.</p>

<h2>The result for ${d.season.name}</h2>
<p>The fitted curve has a mean of about ${d.sr(mean)} SR and a standard deviation of about ${d.sr(sd)} SR. Everything else follows from it:</p>
<ul>
  <li>The share of players in a tier or division is the area under the curve between its first and last SR.</li>
  <li>The percentile of a rank is the area to the left of its first SR.</li>
  <li>The rank for "top X%" is found by running the curve backwards (the quantile function) to get the SR, then looking up the division at that SR.</li>
</ul>

${h.curve({
  label: `Fitted ${d.season.name} curve.`,
  caption: `The fitted ${d.season.name} curve.`,
})}

<h2>Which curve each season uses</h2>
<div class="table-wrap panel"><table>
  <caption>The curve fitted to each season</caption>
  <thead><tr><th scope="col">Season</th><th scope="col">Curve</th><th scope="col">Average miss</th></tr></thead>
  <tbody>
${bySeason
  .map(
    (s) =>
      `    <tr><th scope="row">${s.name}</th><td>${s.model.label}</td><td>${(s.model.rmse * 100).toFixed(2)} points</td></tr>`,
  )
  .join('\n')}
  </tbody>
</table></div>
<p>"Average miss" is the root-mean-square gap between a season's datapoints and its curve, in percentage points. A curve that follows the data misses by nothing unless two of its datapoints contradict each other, in which case it passes between them.</p>

<h2>Where the estimate is strong</h2>
<p>Near the datapoints, the curve is pinned by real figures, so the percentiles there are as good as the figures themselves. Between datapoints, the curve interpolates smoothly, which works well when the points are spread across the ladder. The ladder positions themselves are fixed, so a rank's percentile is always measured in the same place.</p>

<h2>Where it is weak</h2>
<p><strong>Far from the datapoints.</strong> Ranks beyond the outermost datapoints, at the bottom of the ladder and at the very top, are filled in by the bell shape rather than by measurements. If the real distribution has heavier or lighter tails than a bell curve, the estimates there will be off.</p>
<p><strong>Few datapoints.</strong> With only two datapoints the curve fits them exactly, which means any error in either one passes straight into every other number. Each additional datapoint, especially one far from the existing ones, makes the fit more robust.</p>
<p><strong>Rounded sources.</strong> A curve that follows the data reproduces its source, including the source's rounding. A published breakdown that gives each rank to one decimal place cannot say much about ranks holding less than a tenth of a percent.</p>
<p><strong>One curve for all roles.</strong> Overwatch keeps a separate rank for each role. The site fits one curve per season, so it describes competitive players as a whole rather than any one role queue.</p>
<p><strong>Not official.</strong> This is an unofficial fan project, not affiliated with Blizzard Entertainment, and the figures are estimates. Treat them as a well-reasoned approximation rather than a census.</p>

${h.cta('Open the chart to see the fitted curve full size; the readout updates as you move across it.')}

<p>Questions about the data? The ${h.a('faq', 'FAQ')} covers the common ones. For the results of the fit, start with ${h.a('overwatch-rank-distribution', 'the Overwatch rank distribution explained')}. To compare the seasons, see ${h.a('rank-distribution-by-season', 'the rank distribution by season')}.</p>
`;
  },
};
