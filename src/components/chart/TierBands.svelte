<!-- A column per tier; the one under the cursor lights up in its colour. -->
<script>
  import { getChart } from '@/lib/chart/context.js';
  import { app, ladder } from '@/lib/state/app.svelte.js';

  const chart = getChart();
  const s = $derived(chart.scales);
  const activeId = $derived(app.reading.tier.id);
</script>

<g class="bands">
  {#each ladder.tiers as tier (tier.id)}
    <rect
      class="band"
      class:active={tier.id === activeId}
      x={s.x(tier.minSr)}
      y={s.top}
      width={s.span(tier.maxSr - tier.minSr)}
      height={s.innerH}
      style:--color={tier.color}
    />
    {#if tier.index > 0}
      <line class="edge" x1={s.x(tier.minSr)} x2={s.x(tier.minSr)} y1={s.top} y2={s.bottom} />
    {/if}
  {/each}
</g>

<style>
  .band {
    fill: var(--color);
    opacity: 0;
    transition: opacity 320ms var(--ease-out);
  }

  .band.active {
    opacity: 0.09;
  }

  .edge {
    stroke: var(--line);
    stroke-dasharray: 2 5;
  }
</style>
