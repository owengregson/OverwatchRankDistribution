<!--
  The probe: a vertical line, a dot riding the curve and an SR tag on the axis.
  It is hidden until the visitor first picks a point, then arrives: it
  fades in as a ring closes on the dot (`chart.presence` going from 0 to 1).
-->
<script>
  import { getChart } from '@/lib/chart/context.js';
  import { formatSr } from '@/lib/format.js';
  import { clamp } from '@/lib/math/util.js';
  import { app } from '@/lib/state/app.svelte.js';

  const TAG = { width: 50, height: 18, gap: 5 };
  /** The ring that closes on the dot as the cursor arrives: the radius it starts at, and the dot's own. */
  const ARRIVAL_RING = { from: 26, to: 7 };

  const stemPaint = $props.id();

  const chart = getChart();
  const s = $derived(chart.scales);
  const x = $derived(chart.cursorX);
  const y = $derived(s.y(chart.densityAt(app.probe.position)));
  const tagX = $derived(clamp(x, s.left + TAG.width / 2, s.right - TAG.width / 2));
  const presence = $derived(chart.presence);
</script>

<defs>
  <linearGradient id={stemPaint} x1="0" x2="0" y1="0" y2="1">
    <stop class="tier-stop" offset="0" stop-opacity="0" />
    <stop class="tier-stop" offset="0.18" stop-opacity="1" />
    <stop class="tier-stop" offset="1" stop-opacity="0.55" />
  </linearGradient>
</defs>

<g class="cursor" opacity={presence}>
  <!-- A zero-width line has no bounding box for a gradient, so the stem is a thin rect. -->
  <rect class="stem" x={x - 0.75} y={s.top - 12} width="1.5" height={s.bottom - s.top + 12} fill="url(#{stemPaint})" />

  <g style:transform="translate({x}px, {y}px)">
    {#if presence > 0 && presence < 1}
      <!-- Brightest half-way through, gone by the time it reaches the dot. -->
      <circle
        class="arrival-ring"
        r={ARRIVAL_RING.from + (ARRIVAL_RING.to - ARRIVAL_RING.from) * presence}
        opacity={Math.sin(Math.PI * presence)}
      />
    {/if}
    <circle class="pulse" r="7" />
    <circle class="ring" r="7" />
    <circle class="core" r="3.5" />
  </g>

  <g style:transform="translate({tagX}px, {s.bottom + TAG.gap}px)">
    <path
      class="tag"
      d="M{-TAG.width / 2 + 5},0H{TAG.width / 2}V{TAG.height - 5}L{TAG.width / 2 - 5},{TAG.height}H{-TAG.width / 2}V5Z"
    />
    <text y={TAG.height - 5}>{formatSr(app.probe.sr)}</text>
  </g>
</g>

<style>
  .cursor {
    pointer-events: none;
  }

  /* CSS variables only work in styles, not in SVG presentation attributes. */
  .tier-stop {
    stop-color: var(--tier);
  }

  .ring {
    fill: var(--navy-900);
    stroke: var(--tier);
    stroke-width: 2;
  }

  .arrival-ring {
    fill: none;
    stroke: var(--tier);
    stroke-width: 1.5;
  }

  .core {
    fill: var(--ice-50);
  }

  .pulse {
    fill: var(--tier);
    animation: pulse 1.8s var(--ease-out) infinite;
  }

  .tag {
    fill: var(--tier);
  }

  text {
    fill: var(--navy-950);
    font-size: 11px;
    text-anchor: middle;
    font-variant-numeric: tabular-nums;
  }

  @keyframes pulse {
    from {
      transform: scale(1);
      opacity: 0.55;
    }
    to {
      transform: scale(3.2);
      opacity: 0;
    }
  }
</style>
