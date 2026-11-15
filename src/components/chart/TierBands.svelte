<!--
  The dashed rules between tiers. The tier under the cursor is lit up too,
  but only under the curve, so that is painted with the curve (CurveLayer).
-->
<script>
  import { getChart } from '@/lib/chart/context.js';
  import { ladder } from '@/lib/state/app.svelte.js';

  const chart = getChart();
  const s = $derived(chart.scales);
</script>

<g class="bands">
  {#each ladder.tiers as tier (tier.id)}
    {#if tier.index > 0}
      <line class="edge" x1={s.x(tier.minSr)} x2={s.x(tier.minSr)} y1={s.top} y2={s.bottom} />
    {/if}
  {/each}
</g>

<style>
  .edge {
    stroke: var(--line);
    stroke-dasharray: 2 5;
  }
</style>
