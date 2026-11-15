/**
 * Static figures for the article pages, drawn at build time from the fitted
 * season model: an SVG bell curve coloured by tier, and tier share bars.
 * No JavaScript is needed to view them.
 */
import { esc } from './html.js';

const W = 800;
const H = 300;
const PAD = { left: 16, right: 16, top: 34, bottom: 58 };

/**
 * The season's curve, filled tier by tier.
 * @param {object} d site data (scripts/site/data.js)
 * @param {{ markers?: { sr: number, label: string }[], shade?: [number, number], caption: string, label: string }} options
 */
export function bellCurve(d, { markers = [], shade, caption, label }) {
  const { ladder, model } = d;
  const x = (sr) => PAD.left + ((W - PAD.left - PAD.right) * sr) / ladder.maxSr;
  let peak = 0;
  for (let sr = 0; sr <= ladder.maxSr; sr += 5) peak = Math.max(peak, model.pdf(sr));
  const base = H - PAD.bottom;
  const y = (sr) => base - (model.pdf(sr) / peak) * (base - PAD.top);
  const n = (v) => v.toFixed(1);

  const area = (from, to) => {
    let path = `M${n(x(from))} ${base}`;
    for (let sr = from; sr < to; sr += 10) path += `L${n(x(sr))} ${n(y(sr))}`;
    return `${path}L${n(x(to))} ${n(y(to))}L${n(x(to))} ${base}Z`;
  };

  const bands = d.tiers
    .map((t) => {
      const dim = shade && (t.maxSr <= shade[0] || t.minSr >= shade[1]);
      return `<path d="${area(t.minSr, t.maxSr)}" fill="${t.color}" fill-opacity="${dim ? 0.18 : 0.6}"/>`;
    })
    .join('');
  const strip = d.tiers
    .map(
      (t) =>
        `<rect x="${n(x(t.minSr) + 1)}" y="${base + 6}" width="${n(x(t.maxSr) - x(t.minSr) - 2)}" height="6" fill="${t.color}"/>` +
        `<text x="${n(x(t.midSr))}" y="${base + 32}" fill="${t.color}" text-anchor="middle">${esc(t.name)}</text>`,
    )
    .join('');
  let line = '';
  for (let sr = 0; sr <= ladder.maxSr; sr += 10) line += `${sr ? 'L' : 'M'}${n(x(sr))} ${n(y(sr))}`;
  const marks = markers
    .map(({ sr, label: text }, i) => {
      const anchor = x(sr) > W * 0.8 ? 'end' : 'start';
      const dx = anchor === 'end' ? -6 : 6;
      const ty = PAD.top - 12 + i * 18;
      return `<line x1="${n(x(sr))}" x2="${n(x(sr))}" y1="${ty - 4}" y2="${base}" stroke="#ff8336" stroke-width="2" stroke-dasharray="4 3"/>` +
        `<text x="${n(x(sr) + dx)}" y="${ty + 4}" fill="#f1f5fc" text-anchor="${anchor}" class="mark">${esc(text)}</text>`;
    })
    .join('');

  return `<figure class="chart panel">
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">
    ${bands}<path d="${line}" fill="none" stroke="#f1f5fc" stroke-width="2.5"/>
    <line x1="${PAD.left}" x2="${W - PAD.right}" y1="${base}" y2="${base}" stroke="#5e6c93"/>${strip}${marks}
  </svg>
  <figcaption>${caption}</figcaption>
</figure>`;
}

/** Horizontal bars: share of players in each tier (or any list with name, color, share). */
export function shareBars(d, items, { caption, label }) {
  const max = Math.max(...items.map((i) => i.share));
  const rows = items
    .map(
      (item) => `<li style="--c:${item.color}">
      <span class="bar-name">${esc(item.name)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${((item.share / max) * 100).toFixed(1)}%"></span></span>
      <span class="bar-value">${d.pct(item.share)}</span>
    </li>`,
    )
    .join('\n    ');
  return `<figure class="bars panel" aria-label="${esc(label)}">
  <ul>
    ${rows}
  </ul>
  <figcaption>${caption}</figcaption>
</figure>`;
}
