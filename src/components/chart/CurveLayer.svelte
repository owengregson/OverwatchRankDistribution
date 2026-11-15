<!--
  The distribution curve, painted on a canvas (see lib/chart/curveRenderer.js
  for how it is lit). Lit for the players the cursor's rank is better than,
  dim for the players ahead; lit throughout while there is no cursor.

  This component decides when to draw: the finished pictures are repainted
  when the curve or the chart's size changes, and a frame is composed
  whenever something that moves does (the cursor, the intro, the sheen).

  The canvas is larger than the chart by BLEED on every side, so the glow
  around the curve can fade out past the plot's edges. It is shifted back
  by the same amount, so the curve itself sits exactly where the chart's
  scales put it.
-->
<script>
  import { cubicInOut, cubicOut } from 'svelte/easing';
  import { Tween, prefersReducedMotion } from 'svelte/motion';
  import { devicePixelRatio } from 'svelte/reactivity/window';
  import { getChart } from '@/lib/chart/context.js';
  import { BLEED, createCurveRenderer } from '@/lib/chart/curveRenderer.js';
  import { ms } from '@/lib/motion.js';
  import { app, ladder } from '@/lib/state/app.svelte.js';

  /** Canvas pixels per CSS pixel, at most. Beyond 2 the extra detail costs more than it shows. */
  const MAX_PIXEL_RATIO = 2;
  /** A band of light crosses the curve this often (ms), taking SHEEN_DURATION to pass. */
  const SHEEN_EVERY = 9000;
  const SHEEN_DURATION = 2200;
  /** How long a tier's highlight takes to come and go (ms) as the cursor crosses tiers. */
  const BAND_FADE = 320;

  const chart = getChart();
  const renderer = createCurveRenderer(chart.ramp);
  const boundaries = new Set(ladder.divisions.map((division) => division.minSr));

  let canvas = $state();
  const pixelRatio = $derived(Math.min(devicePixelRatio.current ?? 1, MAX_PIXEL_RATIO));

  // The sheen starts once the curve has drawn itself, and not at all for visitors who asked for less motion.
  const sheen = new Tween(0, { duration: SHEEN_DURATION, easing: cubicInOut });
  const drawn = $derived(chart.reveal >= 1);
  $effect(() => {
    if (!drawn || prefersReducedMotion.current) return;
    const timer = setInterval(() => {
      sheen.set(0, { duration: 0 });
      sheen.target = 1;
    }, SHEEN_EVERY);
    return () => clearInterval(timer);
  });

  // The tier under the cursor is lit up; each tier's light fades in and out on its own.
  const bands = ladder.tiers.map((tier) => ({
    tier,
    light: new Tween(0, { duration: ms(BAND_FADE), easing: cubicOut }),
  }));
  const activeTierId = $derived(app.probe.engaged ? app.reading.tier.id : null);
  $effect(() => {
    for (const band of bands) band.light.target = band.tier.id === activeTierId ? 1 : 0;
  });

  /** What the finished pictures were last painted from. */
  let painted = { points: null, pixelRatio: 0 };

  $effect(() => {
    if (!canvas) return;
    const s = chart.scales;
    const { points, presence } = chart;

    if (painted.points !== points || painted.pixelRatio !== pixelRatio) {
      canvas.width = Math.round((s.width + 2 * BLEED) * pixelRatio);
      canvas.height = Math.round((s.height + 2 * BLEED) * pixelRatio);
      renderer.paint(
        {
          ...points,
          width: s.width,
          height: s.height,
          left: s.left,
          right: s.right,
          top: s.top,
          bottom: s.bottom,
          pxPerSr: s.span(1),
          maxSr: ladder.maxSr,
          boundaries,
        },
        pixelRatio,
      );
      painted = { points, pixelRatio };
    }

    const sr = app.probe.position;
    const drawing = chart.reveal < 1;
    const drawnX = s.left + s.innerW * chart.reveal;
    const tipSr = s.srAt(drawnX);

    renderer.compose(canvas.getContext('2d'), {
      splitX: presence > 0 ? chart.splitX : null,
      drawnX: drawing ? drawnX : null,
      bands: bands.map(({ tier, light }) => ({
        from: s.x(tier.minSr),
        to: s.x(tier.maxSr),
        color: chart.ramp.colorAt(tier.midSr),
        strength: light.current * presence,
      })),
      cursor: {
        x: chart.cursorX,
        y: s.y(chart.densityAt(sr)),
        color: chart.ramp.colorAt(sr),
        strength: presence,
      },
      sheen: sheen.current > 0 && sheen.current < 1 ? sheen.current : null,
      // The comet swells as the curve starts to draw and dies away as it finishes.
      comet: drawing
        ? {
            x: drawnX,
            y: s.y(chart.densityAt(tipSr)),
            color: chart.ramp.colorAt(tipSr),
            strength: Math.sin(Math.PI * chart.reveal) ** 0.5,
          }
        : null,
    });
  });
</script>

<canvas bind:this={canvas} style:--bleed="{BLEED}px" aria-hidden="true"></canvas>

<style>
  canvas {
    position: absolute;
    inset: calc(-1 * var(--bleed));
    display: block;
    width: calc(100% + 2 * var(--bleed));
    height: calc(100% + 2 * var(--bleed));
    pointer-events: none;
  }
</style>
