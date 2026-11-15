<!-- Landmarks along the top: the SR at which you beat 10%, 50%, 99%… of players. -->
<script>
  import { cubicInOut } from 'svelte/easing';
  import { Tween } from 'svelte/motion';
  import { getChart } from '@/lib/chart/context.js';
  import { ms } from '@/lib/motion.js';
  import { app } from '@/lib/state/app.svelte.js';

  const MARKS = [1, 10, 25, 50, 75, 90, 99];
  const LABEL_Y = 15;

  const chart = getChart();
  const s = $derived(chart.scales);
  // The marks slide along with the curve when the model changes.
  const positions = Tween.of(() => MARKS.map((percent) => app.model.quantile(percent / 100)), {
    duration: ms(900),
    easing: cubicInOut,
  });
  const marks = $derived(
    MARKS.map((percent, i) => {
      const sr = positions.current[i];
      return { percent, x: s.x(sr), y: s.y(chart.densityAt(sr)) };
    }),
  );
  /** A mark appears once the intro wipe has passed it. */
  const revealed = (x) => chart.reveal >= (x - s.left) / s.innerW;
</script>

<g class="ruler">
  <text class="caption" x={s.left + 6} y={LABEL_Y}>Better than</text>
  {#each marks as mark (mark.percent)}
    <g class="mark" class:shown={revealed(mark.x)} style:transform="translateX({mark.x}px)">
      <line x1="0" x2="0" y1={LABEL_Y + 7} y2={mark.y - 5} />
      <text y={LABEL_Y}>{mark.percent}%</text>
    </g>
  {/each}
</g>

<style>
  .mark {
    opacity: 0;
    transition: opacity 400ms var(--ease-out);
  }

  .mark.shown {
    opacity: 1;
  }

  line {
    stroke: var(--ice-500);
    stroke-dasharray: 1 4;
    stroke-linecap: round;
  }

  text {
    fill: var(--ice-300);
    font-size: 11px;
    text-anchor: middle;
    font-variant-numeric: tabular-nums;
  }

  .caption {
    fill: var(--ice-500);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-anchor: start;
  }
</style>
