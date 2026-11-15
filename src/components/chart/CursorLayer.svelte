<!-- The probe: a vertical line, a dot riding the curve and an SR tag on the axis. -->
<script>
  import { getChart } from '@/lib/chart/context.js';
  import { formatSr } from '@/lib/format.js';
  import { clamp } from '@/lib/math/util.js';
  import { app } from '@/lib/state/app.svelte.js';

  const TAG = { width: 50, height: 18, gap: 5 };

  const chart = getChart();
  const { ids } = chart;
  const s = $derived(chart.scales);
  const x = $derived(chart.cursorX);
  const y = $derived(s.y(chart.densityAt(app.probe.position)));
  const tagX = $derived(clamp(x, s.left + TAG.width / 2, s.right - TAG.width / 2));
</script>

<g class="cursor">
  <!-- A zero-width line has no bounding box for a gradient, so the stem is a thin rect. -->
  <rect class="stem" x={x - 0.75} y={s.top - 26} width="1.5" height={s.bottom - s.top + 26} fill="url(#{ids.cursor})" />

  <g style:transform="translate({x}px, {y}px)">
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

  .ring {
    fill: var(--navy-900);
    stroke: var(--tier);
    stroke-width: 2;
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
