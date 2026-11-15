<!-- SR axis: a tick per division, a labelled tick per tier boundary. -->
<script>
  import { getChart } from '@/lib/chart/context.js';
  import { ladder } from '@/lib/state/app.svelte.js';

  const chart = getChart();
  const s = $derived(chart.scales);

  const boundaries = [...ladder.tiers.map((tier) => tier.minSr), ladder.maxSr];
  const divisionTicks = ladder.divisions
    .map((division) => division.minSr)
    .filter((sr) => !boundaries.includes(sr));

  /** Thin out labels when tiers get narrow. */
  const labelEvery = $derived(s.span(500) < 46 ? 2 : 1);
</script>

<g class="axis">
  <line class="baseline" x1={s.left} x2={s.right} y1={s.bottom} y2={s.bottom} />

  {#each divisionTicks as sr (sr)}
    <line class="minor" x1={s.x(sr)} x2={s.x(sr)} y1={s.bottom} y2={s.bottom + 4} />
  {/each}

  {#each boundaries as sr, i (sr)}
    <line class="major" x1={s.x(sr)} x2={s.x(sr)} y1={s.bottom} y2={s.bottom + 8} />
    {#if i % labelEvery === 0}
      <text
        x={s.x(sr)}
        y={s.bottom + 22}
        text-anchor={i === 0 ? 'start' : i === boundaries.length - 1 ? 'end' : 'middle'}
      >
        {sr}
      </text>
    {/if}
  {/each}
</g>

<style>
  .baseline {
    stroke: var(--line-strong);
  }

  .minor {
    stroke: var(--ice-500);
    opacity: 0.6;
  }

  .major {
    stroke: var(--ice-300);
  }

  text {
    fill: var(--ice-400);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
</style>
