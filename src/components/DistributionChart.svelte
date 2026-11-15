<!--
  The interactive distribution chart.

  This component owns geometry and input (pointer, touch, keyboard) and
  shares the geometry with the layer components in ./chart through context.
  What the chart shows comes from `app` (the season's fitted model and the
  probe); nothing here knows about a particular season.
-->
<script>
  import { onMount } from 'svelte';
  import { cubicInOut } from 'svelte/easing';
  import { Tween } from 'svelte/motion';
  import ChartDefs from '@/components/chart/ChartDefs.svelte';
  import ChartTooltip from '@/components/chart/ChartTooltip.svelte';
  import CompareLayer from '@/components/chart/CompareLayer.svelte';
  import CursorLayer from '@/components/chart/CursorLayer.svelte';
  import CurveLayer from '@/components/chart/CurveLayer.svelte';
  import DatapointMarkers from '@/components/chart/DatapointMarkers.svelte';
  import GridLines from '@/components/chart/GridLines.svelte';
  import PercentileRuler from '@/components/chart/PercentileRuler.svelte';
  import SrAxis from '@/components/chart/SrAxis.svelte';
  import TierBands from '@/components/chart/TierBands.svelte';
  import TierStrip from '@/components/chart/TierStrip.svelte';
  import { setChart } from '@/lib/chart/context.js';
  import { areaPath, createScales, interpolate, linePath, sampleSrs } from '@/lib/chart/geometry.js';
  import { formatPercent, formatSr } from '@/lib/format.js';
  import { ms } from '@/lib/motion.js';
  import { app, ladder } from '@/lib/state/app.svelte.js';

  const PADDING = { top: 54, right: 18, bottom: 30, left: 18 };
  /** SR between curve samples. 10 SR is about 2px on a wide screen: visually smooth. */
  const SAMPLE_STEP = 10;
  /** Empty space kept above the curve's peak, as a fraction of the peak. */
  const HEADROOM = 1.14;
  /** A press that moves less than this many pixels is a click, not a drag. */
  const CLICK_SLOP = 5;
  /** How close (px) the cursor must be to a datapoint or pin to "touch" it. */
  const SNAP_RADIUS = 9;
  const FINE_STEP = 10;

  const uid = $props.id();
  const ids = Object.fromEntries(
    ['tiers', 'fade', 'fadeMask', 'revealed', 'behind', 'ahead', 'cursor'].map((name) => [name, `${uid}-${name}`]),
  );

  const probe = app.probe;
  const srs = sampleSrs(ladder.maxSr, SAMPLE_STEP);

  let plot = $state();
  let width = $state(0);
  let height = $state(0);

  // The curve morphs when the model changes (a new season, or edited datapoints).
  const targetDensities = $derived(srs.map((sr) => app.model.pdf(sr)));
  const densities = Tween.of(() => targetDensities, { duration: ms(900), easing: cubicInOut });
  const peak = $derived(Math.max(...densities.current));

  const scales = $derived(
    createScales({ width, height, padding: PADDING, maxSr: ladder.maxSr, maxDensity: peak * HEADROOM }),
  );
  const densityAt = (sr) => interpolate(srs, densities.current, sr);
  const cursorX = $derived(scales.x(probe.position));

  // Intro: the curve wipes in from the left while the cursor rides out to the median.
  const reveal = new Tween(0, { duration: ms(1500), easing: cubicInOut });
  onMount(() => {
    reveal.target = 1;
    probe.jump(ladder.minSr);
    probe.glide(app.model.quantile(0.5));
  });

  setChart({
    ids,
    densityAt,
    get scales() {
      return scales;
    },
    get cursorX() {
      return cursorX;
    },
    get reveal() {
      return reveal.current;
    },
    get peak() {
      return peak;
    },
    get curve() {
      return linePath(srs, densities.current, scales);
    },
    get area() {
      return areaPath(srs, densities.current, scales);
    },
  });

  const snapSr = $derived((SNAP_RADIUS / scales.innerW) * ladder.maxSr);
  const nearestDatapoint = $derived(
    app.model.points.find((point) => Math.abs(point.sr - probe.sr) <= snapSr) ?? null,
  );

  // ---------- Pointer and touch ----------

  let press = null;

  const srFromEvent = (event) => scales.srAt(event.clientX - plot.getBoundingClientRect().left);

  function onpointerdown(event) {
    if (event.button !== 0) return;
    plot.setPointerCapture(event.pointerId);
    press = { x: event.clientX, moved: false };
    probe.follow(srFromEvent(event));
  }

  function onpointermove(event) {
    if (press && Math.abs(event.clientX - press.x) > CLICK_SLOP) press.moved = true;
    // A mouse scrubs on hover; touch and pen scrub while dragging.
    if (press || event.pointerType === 'mouse') probe.follow(srFromEvent(event));
  }

  function onpointerup(event) {
    const clicked = press && !press.moved && event.pointerType === 'mouse';
    press = null;
    if (clicked) togglePin(Math.round(srFromEvent(event)));
  }

  /** Clicking pins the point; clicking the pin again removes it. */
  function togglePin(sr) {
    if (probe.pinnedSr !== null && Math.abs(probe.pinnedSr - sr) <= snapSr) probe.unpin();
    else probe.pin(sr);
  }

  // ---------- Keyboard ----------

  /** The nearest division (or tier) boundary strictly beyond `sr` in a direction. */
  function nextBoundary(sr, direction, byTier) {
    const stops = (byTier ? ladder.tiers : ladder.divisions).map((item) => item.minSr).concat(ladder.maxSr);
    return direction > 0
      ? (stops.find((stop) => stop > sr) ?? ladder.maxSr)
      : (stops.findLast((stop) => stop < sr) ?? ladder.minSr);
  }

  function onkeydown(event) {
    const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 1, PageDown: -1 }[event.key];
    const sr = probe.target;

    if (direction) {
      if (event.key.startsWith('Page')) probe.glide(nextBoundary(sr, direction, true));
      else if (event.shiftKey) probe.follow(sr + direction * FINE_STEP);
      else probe.glide(nextBoundary(sr, direction, false));
    } else if (event.key === 'Home') probe.glide(ladder.minSr);
    else if (event.key === 'End') probe.glide(ladder.maxSr);
    else if (event.key === 'Enter' || event.key === ' ') togglePin(sr);
    else if (event.key === 'Escape') probe.unpin();
    else return;

    event.preventDefault();
  }
</script>

<div class="chart">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="plot"
    bind:this={plot}
    bind:clientWidth={width}
    bind:clientHeight={height}
    role="slider"
    tabindex="0"
    aria-label="Skill rating"
    aria-orientation="horizontal"
    aria-valuemin={ladder.minSr}
    aria-valuemax={ladder.maxSr}
    aria-valuenow={probe.target}
    aria-valuetext="{app.reading.division.name}, {formatSr(app.reading.sr)} SR, better than {formatPercent(
      app.reading.betterThan,
    )} of players"
    {onpointerdown}
    {onpointermove}
    {onpointerup}
    onpointercancel={() => (press = null)}
    {onkeydown}
  >
    {#if width > 0 && height > 0}
      <svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
        <ChartDefs />
        <TierBands />
        <GridLines />
        <CurveLayer />
        <PercentileRuler />
        <SrAxis />
        <DatapointMarkers nearest={nearestDatapoint} />
        <CompareLayer />
        <CursorLayer />
      </svg>
      <ChartTooltip datapoint={nearestDatapoint} />
    {/if}
  </div>

  <TierStrip padding={PADDING} plotWidth={width} />
</div>

<style>
  .chart {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .plot {
    position: relative;
    flex: 1;
    min-height: 240px;
    /* Horizontal drags scrub the chart; vertical drags still scroll the page. */
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .plot:focus-visible {
    outline-offset: -2px;
  }

  svg {
    position: absolute;
    inset: 0;
    display: block;
    overflow: visible;
  }
</style>
