<!-- Floating card beside the cursor: the rank badge and headline numbers. Hidden until the visitor first picks a point. -->
<script>
  import RankBadge from '@/components/RankBadge.svelte';
  import { getChart } from '@/lib/chart/context.js';
  import { formatPercent, formatSr } from '@/lib/format.js';
  import { clamp } from '@/lib/math/util.js';
  import { app } from '@/lib/state/app.svelte.js';

  /** Gap between the cursor line and the card. */
  const OFFSET = 16;

  const chart = getChart();
  const s = $derived(chart.scales);
  const reading = $derived(app.reading);

  let cardWidth = $state(0);
  let cardHeight = $state(0);

  // Sit to the right of the cursor until there is no room, then flip left.
  const flipped = $derived(chart.cursorX + OFFSET + cardWidth > s.width - 4);
  const dotY = $derived(s.y(chart.densityAt(app.probe.position)));
  const top = $derived(clamp(dotY - cardHeight / 2, s.top, Math.max(s.top, s.bottom - cardHeight - 10)));
</script>

<div
  class="tooltip"
  class:flipped
  style:left="{chart.cursorX}px"
  style:top="{top}px"
  style:--offset="{OFFSET}px"
  style:--presence={chart.presence}
  aria-hidden="true"
>
  <div class="card" bind:clientWidth={cardWidth} bind:clientHeight={cardHeight}>
    <RankBadge tier={reading.tier} division={reading.division.number} size={56} />
    <div class="text">
      <div class="display name">{reading.division.name}</div>
      <div class="numeric sr">{formatSr(reading.sr)} SR</div>
      <div class="numeric beats">Better than <b>{formatPercent(reading.betterThan)}</b></div>
    </div>
  </div>
</div>

<style>
  .tooltip {
    position: absolute;
    z-index: 2;
    pointer-events: none;
    transform: translateX(var(--offset));
    transition: transform 260ms var(--ease-out);
  }

  .tooltip.flipped {
    transform: translateX(calc(-100% - var(--offset)));
  }

  .card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 16px 9px 12px;
    background: linear-gradient(180deg, rgb(20 32 74 / 0.96), rgb(9 15 40 / 0.96));
    border-left: 3px solid var(--tier);
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
    white-space: nowrap;
    /* Arrives with the cursor (--presence: 0 → 1). */
    opacity: var(--presence);
    scale: calc(0.9 + 0.1 * var(--presence));
  }

  .name {
    font-size: 27px;
    color: var(--tier);
  }

  .sr {
    margin-top: 2px;
    font-size: 12px;
    color: var(--ice-200);
  }

  .beats {
    font-size: 11px;
    color: var(--ice-400);
  }

  .beats b {
    color: var(--ice-50);
  }
</style>
