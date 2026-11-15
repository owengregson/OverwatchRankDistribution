<!--
  The interactive distribution chart.

  This component owns geometry and input (pointer, touch, keyboard) and
  shares the geometry with the layer components in ./chart through context.
  What the chart shows comes from `app` (the season's fitted model and the
  probe); nothing here knows about a particular season.
-->
<script>
  import { untrack } from 'svelte';
  import { cubicInOut, cubicOut } from 'svelte/easing';
  import { Tween } from 'svelte/motion';
  import ChartTooltip from '@/components/chart/ChartTooltip.svelte';
  import CompareLayer from '@/components/chart/CompareLayer.svelte';
  import CursorLayer from '@/components/chart/CursorLayer.svelte';
  import CurveLayer from '@/components/chart/CurveLayer.svelte';
  import GridLines from '@/components/chart/GridLines.svelte';
  import PercentileRuler from '@/components/chart/PercentileRuler.svelte';
  import SrAxis from '@/components/chart/SrAxis.svelte';
  import TierBands from '@/components/chart/TierBands.svelte';
  import TierStrip from '@/components/chart/TierStrip.svelte';
  import { setChart } from '@/lib/chart/context.js';
  import { createScales, interpolate, sampleSrs } from '@/lib/chart/geometry.js';
  import { createTierRamp } from '@/lib/chart/tierRamp.js';
  import { formatPercent, formatSr } from '@/lib/format.js';
  import { ms, settle } from '@/lib/motion.js';
  import { app, ladder } from '@/lib/state/app.svelte.js';
  import { intro } from '@/lib/state/intro.svelte.js';

  const PADDING = { top: 62, right: 18, bottom: 30, left: 18 };
  /** SR between curve samples. 10 SR is about 2px on a wide screen; the curve is smoothed between them. */
  const SAMPLE_STEP = 10;
  /** The intro, in ms: once the page opens the curve waits for its panel to arrive, then draws itself. */
  const INTRO = { wait: 520, draw: 1300 };
  /** How quickly the cursor arrives (ms) the first time the visitor picks a point. */
  const CURSOR_ARRIVAL = 320;
  /** Empty space kept above the curve's peak, as a fraction of the peak. */
  const HEADROOM = 1.14;
  /** A press that moves less than this many pixels is a click, not a drag. */
  const CLICK_SLOP = 5;
  /** How close (px) a click must be to the first pin to count as clicking it. */
  const SNAP_RADIUS = 9;
  const FINE_STEP = 10;

  const probe = app.probe;
  const srs = sampleSrs(ladder.maxSr, SAMPLE_STEP);
  const ramp = createTierRamp(ladder);

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
  /** The curve's samples in pixels. */
  const points = $derived({ xs: srs.map(scales.x), ys: densities.current.map(scales.y) });

  // Intro: once the page opens (see lib/state/intro.svelte.js) the curve
  // draws itself from the left, fully lit, and that is all. The cursor,
  // its card and the tier highlight only arrive when the visitor picks a
  // point (`probe.engaged`), and never before the curve has finished drawing.
  const reveal = new Tween(0, { duration: ms(INTRO.draw), easing: settle });
  let drawn = $state(false);

  async function playIntro() {
    // The side panels need somewhere to start: the median player.
    probe.jump(app.model.quantile(0.5));
    await reveal.set(1, { delay: ms(INTRO.wait) });
    drawn = true;
  }

  $effect(() => {
    if (intro.opened) untrack(playIntro);
  });

  /** How present the cursor is: 0 while the chart shows the curve alone, 1 once a point is picked. */
  const presence = new Tween(0, { duration: ms(CURSOR_ARRIVAL), easing: cubicOut });
  $effect(() => {
    if (drawn && probe.engaged) presence.target = 1;
  });

  /** Lit up to here, dim beyond: the right-hand edge while there is no cursor, then the cursor. */
  const splitX = $derived(cursorX + (scales.width - cursorX) * (1 - presence.current));

  setChart({
    ramp,
    densityAt,
    get scales() {
      return scales;
    },
    get cursorX() {
      return cursorX;
    },
    get splitX() {
      return splitX;
    },
    get reveal() {
      return reveal.current;
    },
    get presence() {
      return presence.current;
    },
    get peak() {
      return peak;
    },
    get points() {
      return points;
    },
  });

  const snapSr = $derived((SNAP_RADIUS / scales.innerW) * ladder.maxSr);

  // ---------- Pointer and touch ----------

  let press = null;

  const srFromEvent = (event) => scales.srAt(event.clientX - plot.getBoundingClientRect().left);

  function onpointerdown(event) {
    if (event.button !== 0) return;
    // Capture keeps the drag alive when the pointer strays outside the chart.
    // It can fail for a pointer that is already gone; the drag still works inside the chart.
    try {
      plot.setPointerCapture(event.pointerId);
    } catch {
      // Nothing to do.
    }
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

  /**
   * The first click pins where the comparison starts, the second where it
   * ends; after that the pointer is free again. Clicking the first pin
   * before placing the second takes it back.
   */
  function togglePin(sr) {
    if (probe.comparing === 'measuring' && Math.abs(probe.pinnedSr - sr) <= snapSr) probe.unpin();
    else probe.pin(sr);
  }

  /** A right click clears the pins. (The browser's own menu is already turned off, see lib/guard.js.) */
  function oncontextmenu(event) {
    event.preventDefault();
    probe.unpin();
  }

  // ---------- Keyboard ----------

  /** The middle of the division one step away: the next division, or the same division a tier over. */
  function neighbour(sr, direction, byTier) {
    const here = ladder.divisionAt(sr);
    const step = direction * (byTier ? ladder.divisionsPerTier : 1);
    return (ladder.divisions[here.index + step] ?? here).midSr;
  }

  function onkeydown(event) {
    const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 1, PageDown: -1 }[event.key];
    const sr = probe.target;

    if (direction) {
      if (event.shiftKey) probe.follow(sr + direction * FINE_STEP);
      else probe.goTo(neighbour(sr, direction, event.key.startsWith('Page')));
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
    {oncontextmenu}
    {onkeydown}
  >
    {#if width > 0 && height > 0}
      <!-- Back to front: the grid, the curve on its canvas, then everything that sits over the curve. -->
      <svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
        <TierBands />
        <GridLines />
      </svg>
      <CurveLayer />
      <svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
        <PercentileRuler />
        <SrAxis />
        <CompareLayer />
        <CursorLayer />
      </svg>
      <ChartTooltip />
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
