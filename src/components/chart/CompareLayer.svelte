<!-- The pinned point and the bracket measuring the gap from it to the cursor. -->
<script>
  import { getChart } from '@/lib/chart/context.js';
  import { formatPercent, formatSr } from '@/lib/format.js';
  import { clamp } from '@/lib/math/util.js';
  import { app } from '@/lib/state/app.svelte.js';

  const BRACKET_Y = 38;
  /** Half the widest label, to keep it inside the plot. */
  const LABEL_HALF_WIDTH = 118;

  const chart = getChart();
  const s = $derived(chart.scales);
  const pinnedSr = $derived(app.probe.pinnedSr);
  const pinX = $derived(s.x(pinnedSr ?? 0));
  const from = $derived(Math.min(pinX, chart.cursorX));
  const to = $derived(Math.max(pinX, chart.cursorX));
  const labelX = $derived(
    clamp((from + to) / 2, s.left + LABEL_HALF_WIDTH, Math.max(s.left + LABEL_HALF_WIDTH, s.right - LABEL_HALF_WIDTH)),
  );
</script>

{#if app.comparison}
  <g class="compare">
    <rect class="span" x={from} y={s.top} width={to - from} height={s.innerH} />
    <path class="bracket" d="M{from},{BRACKET_Y + 6}V{BRACKET_Y}H{to}V{BRACKET_Y + 6}" />
    <text x={labelX} y={BRACKET_Y - 7}>
      {formatSr(app.comparison.srGap)} SR apart
      <tspan class="soft" dx="4">·</tspan>
      <tspan dx="4">{formatPercent(app.comparison.playersBetween)} of players between</tspan>
    </text>

    {#key pinnedSr}
      <g class="pin" style:transform="translateX({pinX}px)">
        <line x1="0" x2="0" y1={BRACKET_Y} y2={s.bottom} />
        <rect class="head" x="-5" y={BRACKET_Y - 5} width="10" height="10" />
        <circle class="ping" cx="0" cy={s.y(chart.densityAt(pinnedSr))} r="5" />
        <circle class="dot" cx="0" cy={s.y(chart.densityAt(pinnedSr))} r="4" />
      </g>
    {/key}
  </g>
{/if}

<style>
  .span {
    fill: var(--orange);
    opacity: 0.07;
  }

  .bracket {
    fill: none;
    stroke: var(--orange-hot);
    stroke-width: 1.5;
  }

  text {
    fill: var(--ice-100);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-anchor: middle;
    font-variant-numeric: tabular-nums;
    paint-order: stroke;
    stroke: var(--navy-900);
    stroke-width: 4px;
    stroke-linejoin: round;
  }

  .soft {
    fill: var(--orange-hot);
  }

  .pin {
    animation: drop 420ms var(--ease-back) both;
  }

  .pin line {
    stroke: var(--orange-hot);
    stroke-width: 1.5;
    stroke-dasharray: 3 4;
  }

  .head {
    fill: var(--orange);
    stroke: var(--ice-50);
    stroke-width: 1.5;
    transform-box: fill-box;
    transform-origin: center;
    transform: rotate(45deg);
  }

  .dot {
    fill: var(--orange);
    stroke: var(--ice-50);
    stroke-width: 1.5;
  }

  .ping {
    fill: none;
    stroke: var(--orange-hot);
    stroke-width: 2;
    transform-box: fill-box;
    transform-origin: center;
    animation: ping 700ms var(--ease-out) 200ms both;
  }

  @keyframes drop {
    from {
      opacity: 0;
      translate: 0 -22px;
    }
  }

  @keyframes ping {
    from {
      transform: scale(1);
      opacity: 1;
    }
    to {
      transform: scale(5);
      opacity: 0;
    }
  }
</style>
