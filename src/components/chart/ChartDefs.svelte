<!-- Gradients, masks and clip paths shared by the chart layers. -->
<script>
  import { getChart } from '@/lib/chart/context.js';
  import { ladder } from '@/lib/state/app.svelte.js';

  /** SR over which neighbouring tier colours blend into each other. */
  const BLEND = 70;

  const chart = getChart();
  const { ids } = chart;
  const s = $derived(chart.scales);
  const revealedWidth = $derived(
    chart.reveal >= 1 ? s.width : s.left + s.innerW * chart.reveal,
  );
</script>

<defs>
  <!-- Tier colours laid along the SR axis. -->
  <linearGradient id={ids.tiers} gradientUnits="userSpaceOnUse" x1={s.left} x2={s.right} y1="0" y2="0">
    {#each ladder.tiers as tier (tier.id)}
      <stop offset={(tier.minSr + (tier.index === 0 ? 0 : BLEND)) / ladder.maxSr} stop-color={tier.color} />
      <stop offset={(tier.maxSr - (tier.isTop ? 0 : BLEND)) / ladder.maxSr} stop-color={tier.color} />
    {/each}
  </linearGradient>

  <!-- Fades the filled area out towards the baseline. -->
  <linearGradient id={ids.fade} x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="1" />
    <stop offset="1" stop-color="#fff" stop-opacity="0.16" />
  </linearGradient>
  <mask id={ids.fadeMask} maskUnits="userSpaceOnUse" x="0" y="0" width={s.width} height={s.height}>
    <rect x={s.left} y={s.top} width={s.innerW} height={s.innerH} fill="url(#{ids.fade})" />
  </mask>

  <!-- Intro wipe. -->
  <clipPath id={ids.revealed}>
    <rect x="0" y="0" width={revealedWidth} height={s.height} />
  </clipPath>

  <!-- Either side of the cursor: players behind you, players ahead. -->
  <clipPath id={ids.behind}>
    <rect x="0" y="0" width={Math.max(0, chart.cursorX)} height={s.height} />
  </clipPath>
  <clipPath id={ids.ahead}>
    <rect x={chart.cursorX} y="0" width={Math.max(0, s.width - chart.cursorX)} height={s.height} />
  </clipPath>

  <linearGradient id={ids.cursor} x1="0" x2="0" y1="0" y2="1">
    <stop class="tier-stop" offset="0" stop-opacity="0" />
    <stop class="tier-stop" offset="0.18" stop-opacity="1" />
    <stop class="tier-stop" offset="1" stop-opacity="0.55" />
  </linearGradient>
</defs>

<style>
  /* CSS variables only work in styles, not in SVG presentation attributes. */
  .tier-stop {
    stop-color: var(--tier);
  }
</style>
