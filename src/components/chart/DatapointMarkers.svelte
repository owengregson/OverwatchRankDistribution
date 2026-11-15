<!-- The season's datapoints, marked where they sit on the fitted curve. -->
<script>
  import { getChart } from '@/lib/chart/context.js';
  import { app } from '@/lib/state/app.svelte.js';

  let { nearest = null } = $props();

  const chart = getChart();
  const s = $derived(chart.scales);
  const revealed = (x) => chart.reveal >= (x - s.left) / s.innerW;
</script>

<g class="datapoints">
  {#each app.model.points as point (point.sr)}
    {@const x = s.x(point.sr)}
    <g
      class="point"
      class:shown={revealed(x)}
      class:active={point === nearest}
      style:transform="translate({x}px, {s.y(chart.densityAt(point.sr))}px)"
    >
      <rect class="halo" x="-5" y="-5" width="10" height="10" />
      <rect class="gem" x="-3.5" y="-3.5" width="7" height="7" />
    </g>
  {/each}
</g>

<style>
  .point {
    opacity: 0;
    transition: opacity 300ms var(--ease-out);
  }

  .point.shown {
    opacity: 1;
  }

  rect {
    transform-box: fill-box;
    transform-origin: center;
    transform: rotate(45deg);
    transition: transform 260ms var(--ease-back);
  }

  .gem {
    fill: var(--ice-50);
    stroke: var(--orange);
    stroke-width: 1.5;
  }

  .halo {
    fill: none;
    stroke: var(--orange-hot);
    stroke-width: 1;
    animation: halo 2.4s var(--ease-out) infinite;
  }

  .active .gem {
    transform: rotate(45deg) scale(1.6);
    fill: var(--orange-hot);
    stroke: var(--ice-50);
  }

  @keyframes halo {
    from {
      transform: rotate(45deg) scale(0.8);
      opacity: 0.9;
    }
    to {
      transform: rotate(45deg) scale(2.6);
      opacity: 0;
    }
  }
</style>
