/**
 * Building blocks the article bodies use: links, tables and figures that
 * read their numbers from the site data, and the standard estimate note.
 */
import { bellCurve, shareBars } from './charts.js';
import { esc } from './html.js';

/**
 * @param {object} d    site data (scripts/site/data.js)
 * @param {string} root relative prefix from the page back to the site root
 */
export function createKit(d, root) {
  const href = (slug) => `${root}articles/${slug}/`;
  const tierName = (t) => `<span class="tier" style="--c:${t.color}">${esc(t.name)}</span>`;
  const datapointList = () => {
    const names = d.datapoints.map((p) => p.label);
    if (names.length <= 1) return names.join('');
    return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  };

  return {
    href,
    /** Link to another article. */
    a: (slug, text) => `<a href="${href(slug)}">${text}</a>`,
    /** Link to the interactive chart. */
    chart: (text) => `<a href="${root}">${text}</a>`,
    tierName,

    /** Call to action back to the interactive chart. */
    cta: (text = 'Move across the curve to read the rank, SR and percentile at any point, look up your own rank, or pin two ranks to compare them.') =>
      `<aside class="cta panel">
  <p class="display slanted">See it on the interactive chart</p>
  <p>${text}</p>
  <a class="button" href="${root}">Open the rank distribution chart</a>
</aside>`,

    /** The standard caveat on where the numbers come from. */
    estimateNote: () =>
      `<aside class="note">
  <p><strong>About these numbers.</strong> Every figure on this page is an estimate from the ${esc(d.season.name)} curve, fitted to ${d.datapoints.length} community-submitted datapoint${d.datapoints.length === 1 ? '' : 's'} (${esc(datapointList())}). Blizzard does not publish a rank distribution, so these are not official figures. Read <a href="${href('how-the-estimate-works')}">how the estimate is made</a> for what that means for accuracy.</p>
</aside>`,

    datapointList,

    /** Tier, SR range, share of players, percentile at the start of the tier. */
    tierTable: ({ caption = 'Estimated share of players in each tier' } = {}) => `<div class="table-wrap panel"><table>
  <caption>${caption}</caption>
  <thead><tr><th scope="col">Tier</th><th scope="col">SR range</th><th scope="col">Players in tier</th><th scope="col">Better than (at tier start)</th><th scope="col">Top (at tier start)</th></tr></thead>
  <tbody>
${[...d.tiers]
  .reverse()
  .map(
    (t) =>
      `    <tr><th scope="row">${tierName(t)}</th><td>${t.range}</td><td>${d.pct(t.share)}</td><td>${d.pct(t.below)}</td><td>${d.pct(t.top)}</td></tr>`,
  )
  .join('\n')}
  </tbody>
</table></div>`,

    /** Every division of the given tiers (all tiers by default), highest first. */
    divisionTable: (ids = d.tiers.map((t) => t.id), { caption = 'Estimated percentile at the start of each division' } = {}) => `<div class="table-wrap panel"><table>
  <caption>${caption}</caption>
  <thead><tr><th scope="col">Division</th><th scope="col">SR range</th><th scope="col">Players in division</th><th scope="col">Better than</th><th scope="col">Top</th></tr></thead>
  <tbody>
${d.divisions
  .filter((div) => ids.includes(div.tier.id))
  .reverse()
  .map(
    (div) =>
      `    <tr><th scope="row"><span class="tier" style="--c:${div.tier.color}">${esc(div.name)}</span></th><td>${div.range}</td><td>${d.pct(div.share)}</td><td>${d.pct(div.below)}</td><td>${d.pct(div.top)}</td></tr>`,
  )
  .join('\n')}
  </tbody>
</table></div>`,

    /** "Top X%" cut-offs: the SR and rank at each. */
    cutoffTable: (fractions, { caption = 'Estimated rank needed for each top percentage' } = {}) => `<div class="table-wrap panel"><table>
  <caption>${caption}</caption>
  <thead><tr><th scope="col">Top</th><th scope="col">Better than</th><th scope="col">SR</th><th scope="col">Rank at that SR</th></tr></thead>
  <tbody>
${fractions
  .map((f) => {
    const cut = d.topCut(f);
    return `    <tr><th scope="row">Top ${d.pct(f)}</th><td>${d.pct(1 - f)}</td><td>${d.sr(cut.sr)}</td><td><span class="tier" style="--c:${cut.tier.color}">${esc(cut.division.name)}</span></td></tr>`;
  })
  .join('\n')}
  </tbody>
</table></div>`,

    bell: (options) => bellCurve(d, options),
    bars: (items, options) => shareBars(d, items, options),
    tierBars: (options) => shareBars(d, d.tiers, options),
  };
}
