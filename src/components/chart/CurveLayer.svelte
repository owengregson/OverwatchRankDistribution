<!--
  The distribution curve. Drawn twice: dimmed for players ahead of the
  cursor, lit for the players the cursor's rank is better than.
-->
<script>
  import { getChart } from '@/lib/chart/context.js';

  const chart = getChart();
  const { ids } = chart;
  const paint = `url(#${ids.tiers})`;
</script>

<g clip-path="url(#{ids.revealed})">
  <g class="ahead" clip-path="url(#{ids.ahead})">
    <path d={chart.area} fill={paint} opacity="0.12" />
    <path class="line" d={chart.curve} stroke={paint} stroke-width="1.5" opacity="0.5" />
  </g>

  <g class="behind" clip-path="url(#{ids.behind})">
    <path d={chart.area} fill={paint} mask="url(#{ids.fadeMask})" opacity="0.88" />
    <!-- Two soft wide strokes stand in for a glow without an SVG filter. -->
    <path class="line" d={chart.curve} stroke={paint} stroke-width="14" opacity="0.07" />
    <path class="line" d={chart.curve} stroke={paint} stroke-width="7" opacity="0.16" />
    <path class="line" d={chart.curve} stroke={paint} stroke-width="2.5" />
  </g>
</g>

<style>
  .line {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
</style>
