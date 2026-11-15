<!-- Horizontal guides: share of players per 100 SR (one division for most tiers). -->
<script>
  import { getChart } from '@/lib/chart/context.js';
  import { niceTicks } from '@/lib/math/util.js';

  /** Densities are per 1 SR; ×100 SR ×100 % turns them into "% of players per 100 SR". */
  const PER_100_SR_PERCENT = 100 * 100;

  const chart = getChart();
  const s = $derived(chart.scales);
  const ticks = $derived(niceTicks(chart.peak * PER_100_SR_PERCENT, 4));
</script>

<g class="grid">
  {#each ticks as tick, i (tick)}
    {@const y = s.y(tick / PER_100_SR_PERCENT)}
    <line x1={s.left} x2={s.right} y1={y} y2={y} />
    <text x={s.left + 6} y={y - 6}>
      {tick}%{#if i === ticks.length - 1}<tspan class="unit" dx="6">of players per 100 SR</tspan>{/if}
    </text>
  {/each}
</g>

<style>
  line {
    stroke: var(--line);
  }

  text {
    fill: var(--ice-400);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .unit {
    fill: var(--ice-500);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 10px;
  }
</style>
