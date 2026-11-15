<!--
  Header chip that opens a summary of the season's model: the curve family,
  its fitted parameters, and each datapoint next to what the curve says.
-->
<script>
  import { formatPercent, formatSr } from '@/lib/format.js';
  import { pop } from '@/lib/motion.js';
  import { app, ladder } from '@/lib/state/app.svelte.js';

  let open = $state(false);
  let root = $state();

  const model = $derived(app.model);
  const count = $derived(model.points.length);
  const median = $derived(model.quantile(0.5));

  /** Reported and fitted values, shown with enough decimals to see a difference. */
  const exact = (fraction) => `${(fraction * 100).toFixed(2)}%`;

  function closeOnOutside(event) {
    if (open && !root.contains(event.target)) open = false;
  }

  function closeOnEscape(event) {
    if (open && event.key === 'Escape') open = false;
  }
</script>

<svelte:window onpointerdown={closeOnOutside} onkeydown={closeOnEscape} />

<div class="model" bind:this={root}>
  <button type="button" class="chip" class:open aria-expanded={open} aria-controls="model-details" onclick={() => (open = !open)}>
    <span class="gem"></span>
    <span class="numeric">{count} datapoint{count === 1 ? '' : 's'}</span>
    <span class="sep">/</span>
    <span>{model.label}</span>
    <span class="caret"></span>
  </button>

  {#if open}
    <div class="popover" id="model-details" role="dialog" aria-label="{app.season.name} model" transition:pop={{ from: 0.94, duration: 200 }}>
      <p class="eyebrow">{app.season.name}</p>
      <h2 class="display">Fitted from the data</h2>
      <p class="lede">
        The curve is not drawn by hand. It is a {model.label.toLowerCase()} fitted to this season's datapoints, and refits whenever one
        is added or changed.
      </p>

      <dl class="params">
        <div>
          <dt class="eyebrow">Median</dt>
          <dd class="display numeric">{formatSr(median)} <small>SR</small></dd>
          <dd class="note">{ladder.divisionAt(median).name}</dd>
        </div>
        <div>
          <dt class="eyebrow">Spread</dt>
          <dd class="display numeric">{formatSr(model.params.sd)} <small>SR</small></dd>
          <dd class="note">one standard deviation</dd>
        </div>
        <div>
          <dt class="eyebrow">Fit error</dt>
          <dd class="display numeric">{(model.rmse * 100).toFixed(2)} <small>pts</small></dd>
          <dd class="note">{model.rmse < 5e-5 ? 'passes through every point' : 'average miss'}</dd>
        </div>
      </dl>

      <table>
        <thead>
          <tr>
            <th scope="col">Datapoint</th>
            <th scope="col">Reported</th>
            <th scope="col">Curve</th>
          </tr>
        </thead>
        <tbody>
          {#each model.points as point}
            <tr>
              <th scope="row"><span class="gem"></span>{point.label} <span class="at numeric">{formatSr(point.sr)} SR</span></th>
              <td class="numeric">beats {formatPercent(point.p)}</td>
              <td class="numeric">{exact(point.fitted)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .model {
    position: relative;
  }

  .chip {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 12px;
    border-radius: var(--radius);
    color: var(--navy-700);
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    transition: background 180ms;
  }

  .chip:hover,
  .chip.open {
    background: rgb(16 27 64 / 0.09);
  }

  .sep {
    color: var(--ice-400);
  }

  .gem {
    display: inline-block;
    width: 7px;
    height: 7px;
    flex: none;
    rotate: 45deg;
    background: var(--orange);
  }

  .chip .gem {
    animation: beat 2.4s ease-in-out infinite;
  }

  .caret {
    width: 6px;
    height: 6px;
    margin: -3px 2px 0 2px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    rotate: 45deg;
    transition:
      rotate 240ms var(--ease-back),
      margin 240ms;
  }

  .open .caret {
    rotate: 225deg;
    margin-top: 3px;
  }

  .popover {
    position: absolute;
    top: calc(100% + 14px);
    right: 0;
    z-index: 20;
    width: min(400px, calc(100vw - 2 * var(--gutter)));
    padding: 18px 20px 16px;
    transform-origin: top right;
    background: linear-gradient(180deg, #1b2a5e, #0d1637);
    border: 1px solid var(--line-strong);
    border-top: 3px solid var(--orange);
    box-shadow: 0 24px 60px rgb(0 0 0 / 0.55);
    color: var(--ice-100);
  }

  h2 {
    margin-top: 2px;
    font-size: 34px;
    font-style: italic;
  }

  .lede {
    margin-top: 8px;
    font-size: 12px;
    color: var(--ice-300);
    text-wrap: pretty;
  }

  .params {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 14px 0;
    padding: 12px 0;
    border-block: 1px solid var(--line);
  }

  .params dt {
    font-size: 10px;
  }

  .params dd {
    margin: 2px 0 0;
  }

  .params .display {
    font-size: 30px;
  }

  small {
    font-size: 0.5em;
    color: var(--ice-400);
  }

  .note {
    font-size: 10px;
    color: var(--ice-400);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  thead th {
    padding-bottom: 6px;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ice-400);
  }

  th {
    text-align: left;
    font-weight: inherit;
  }

  td,
  th:not(:first-child) {
    text-align: right;
  }

  tbody tr {
    border-top: 1px solid var(--line);
  }

  tbody th,
  tbody td {
    padding: 7px 0;
  }

  tbody .gem {
    margin-right: 9px;
  }

  .at {
    margin-left: 6px;
    color: var(--ice-400);
  }

  @keyframes beat {
    0%,
    100% {
      scale: 1;
    }
    50% {
      scale: 1.35;
    }
  }
</style>
