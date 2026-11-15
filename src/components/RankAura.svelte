<!--
  The light effect around a rank icon, as in game. Metal tiers have none;
  the rest are built from up to four pieces, set per effect in EFFECTS:

    halo      a glow that hugs the icon                          (behind)
    streak    a long horizontal hairline through the icon        (behind)
    rays      short shines fanning out from the centre, each at
              a fixed angle, slowly fading in and out            (in front)
    sparkles  small crossed glints that take turns to swell in
              and fade out at fixed spots, without spinning      (in front)

  RankBadge draws this twice: layer="back" under the icon and
  layer="front" over it, where the light adds to the artwork.

  Which tier gets which effect is the tier's `glow` in src/data/ladder.js.

  All lengths are in source pixels of the icon artwork (an icon is about
  430 wide) and are multiplied by --unit, inherited from RankBadge, so the
  effect scales with the badge. Positions are measured from the centre of
  the effect: x to the right, y downwards.

  The ray positions were traced from the game (assets/reference/
  HighlightedShines.png): each is [angle, reach, level], with the angle in
  degrees clockwise from pointing right, the reach being how far from the
  centre its tip is, and the level being how visible it gets.
-->
<script module>
  /** Peak opacity of a ray by level. The streak is 1; even a bright ray is about two thirds of it. */
  const LEVELS = { faint: 0.15, mid: 0.36, bright: 0.64 };

  /** Rays start this far from the centre and are this thick: a touch thicker than the streak. */
  const RAY = { start: 60, thickness: 7 };

  const EFFECTS = {
    // Emerald, Diamond
    soft: { halo: { reach: 580, peak: 36 } },

    // Master
    radiant: {
      halo: { reach: 680, peak: 78, breathes: true },
      sparkles: { period: 5, spots: [{ x: 204, y: -18, span: 120 }] },
    },

    // Grandmaster
    flare: {
      // The light sits a little above the middle of this wide, short icon.
      origin: { x: 0, y: -20 },
      halo: { reach: 680, peak: 82, breathes: true },
      streak: { length: 1240, thickness: 5 },
      rays: [
        [-145, 250, 'bright'],
        [-129, 211, 'mid'],
        [-68, 222, 'bright'],
        [-52, 195, 'mid'],
        [-26, 254, 'faint'],
        [29, 229, 'faint'],
        [38, 221, 'bright'],
        [57, 175, 'faint'],
        [67, 184, 'faint'],
        [133, 220, 'faint'],
        [152, 207, 'faint'],
        [164, 248, 'faint'],
      ],
      sparkles: {
        period: 11,
        spots: [
          { x: -250, y: 78, span: 130 },
          { x: 12, y: -90, span: 150 },
          { x: -216, y: -25, span: 120 },
          { x: 166, y: 110, span: 120 },
        ],
      },
    },

    // Champion
    blaze: {
      halo: { reach: 720, peak: 92, breathes: true },
      streak: { length: 1380, thickness: 7 },
      rays: [
        [-175, 266, 'faint'],
        [-151, 262, 'mid'],
        [-144, 240, 'bright'],
        [-127, 212, 'mid'],
        [-68, 203, 'bright'],
        [-52, 202, 'faint'],
        [-26, 290, 'mid'],
        [29, 235, 'mid'],
        [36, 236, 'bright'],
        [53, 196, 'faint'],
        [64, 168, 'faint'],
        [85, 170, 'faint'],
        [110, 171, 'faint'],
        [133, 223, 'faint'],
        [140, 247, 'faint'],
        [162, 236, 'faint'],
        [168, 243, 'faint'],
      ],
      sparkles: {
        period: 10,
        spots: [
          { x: -234, y: -22, span: 130 },
          { x: 254, y: 12, span: 140 },
          { x: -175, y: 32, span: 100 },
        ],
      },
    },
  };

  /**
   * Each ray fades on its own slow clock so the fan never pulses in unison.
   * The timings are spread out from the ray's position in the list, which
   * keeps them the same on every render.
   */
  const rayPeriod = (i) => 7 + ((i * 37) % 50) / 10; // 7–12 s
  const rayOffset = (i) => -((i * 53) % 100) / 10; //   start part-way through
</script>

<script>
  let { effect, color, layer } = $props();

  const parts = $derived(EFFECTS[effect]);
  const origin = $derived(parts?.origin ?? { x: 0, y: 0 });
</script>

{#if parts}
  <span
    class="aura {layer}"
    style:--color={color}
    style:--x={origin.x}
    style:--y={origin.y}
    aria-hidden="true"
  >
    {#if layer === 'back'}
      <span class="halo" class:breathes={parts.halo.breathes} style:--reach={parts.halo.reach} style:--peak="{parts.halo.peak}%"></span>
      {#if parts.streak}
        <span class="streak" style:--length={parts.streak.length} style:--thickness={parts.streak.thickness}></span>
      {/if}
    {:else}
      {#each parts.rays ?? [] as [angle, reach, level], i}
        <span
          class="ray"
          style:--from={RAY.start}
          style:--length={reach - RAY.start}
          style:--thickness={RAY.thickness}
          style:--level={LEVELS[level]}
          style:rotate="{angle}deg"
          style:animation-duration="{rayPeriod(i)}s"
          style:animation-delay="{rayOffset(i)}s"
        ></span>
      {/each}

      {#if parts.sparkles}
        {@const { period, spots } = parts.sparkles}
        {#each spots as spot, i}
          <span
            class="sparkle"
            style:--span={spot.span}
            style:left="calc(var(--unit) * {spot.x})"
            style:top="calc(var(--unit) * {spot.y})"
            style:animation-duration="{period}s"
            style:animation-delay="{(-i * period) / spots.length}s"
          ></span>
        {/each}
      {/if}
    {/if}
  </span>
{/if}

<style>
  /* A zero-size point at the centre of the effect; never part of the layout. */
  .aura {
    position: absolute;
    left: calc(50% + var(--unit) * var(--x));
    top: calc(50% + var(--unit) * var(--y));
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .back {
    z-index: -1;
  }

  /* Over the icon, light adds to what is underneath instead of covering it. */
  .front {
    z-index: 1;
    mix-blend-mode: plus-lighter;
  }

  .aura > * {
    position: absolute;
  }

  /*
   * The halo is concentrated behind the icon and dies away quickly past its
   * edge. The stops follow a bell-shaped falloff (bright core, soft
   * shoulder, faint tail) rather than a straight fade, which would look
   * like a wide flat disc.
   *
   * --reach is the halo's diameter, --peak its brightness at the centre.
   */
  .halo {
    width: calc(var(--unit) * var(--reach));
    aspect-ratio: 1;
    translate: -50% -50%;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      color-mix(in srgb, var(--color) var(--peak), transparent) 0%,
      color-mix(in srgb, var(--color) calc(var(--peak) * 0.88), transparent) 18%,
      color-mix(in srgb, var(--color) calc(var(--peak) * 0.6), transparent) 36%,
      color-mix(in srgb, var(--color) calc(var(--peak) * 0.32), transparent) 54%,
      color-mix(in srgb, var(--color) calc(var(--peak) * 0.13), transparent) 70%,
      color-mix(in srgb, var(--color) calc(var(--peak) * 0.04), transparent) 86%,
      transparent 100%
    );
  }

  /* Brightness only, so the halo's shape stays put. */
  .halo.breathes {
    animation: breathe 4.2s ease-in-out infinite;
  }

  /* A hairline of light through the centre: white-hot in the middle, coloured, then gone. */
  .streak {
    width: calc(var(--unit) * var(--length));
    height: max(1px, calc(var(--unit) * var(--thickness)));
    translate: -50% -50%;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--color) 50%, transparent) 20%,
      color-mix(in srgb, var(--color) 55%, #fff) 42%,
      #fff 50%,
      color-mix(in srgb, var(--color) 55%, #fff) 58%,
      color-mix(in srgb, var(--color) 50%, transparent) 80%,
      transparent
    );
    filter: blur(calc(var(--unit) * 1.5));
    animation: shimmer 3.6s ease-in-out infinite;
  }

  /*
   * A ray is a short spindle of light pointing away from the centre: it
   * starts --from out, is --length long, and is turned to its angle around
   * the centre. It fades in and out slowly and never gets brighter than
   * its --level.
   */
  .ray {
    left: calc(var(--unit) * var(--from));
    width: calc(var(--unit) * var(--length));
    height: max(1px, calc(var(--unit) * var(--thickness)));
    translate: 0 -50%;
    transform-origin: calc(var(--unit) * var(--from) * -1) 50%;
    border-radius: 50%;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--color) 45%, #fff) 45%,
      color-mix(in srgb, var(--color) 70%, #fff) 70%,
      transparent
    );
    opacity: 0;
    animation: glow 9s ease-in-out infinite;
  }

  /*
   * Sparkle: a bright point with two crossing hairline rays. Most of the
   * time it is invisible; once per cycle it swells in and fades out in
   * place. Sparkles share a cycle and take turns.
   */
  .sparkle {
    width: calc(var(--unit) * var(--span));
    aspect-ratio: 1;
    translate: -50% -50%;
    background: radial-gradient(
      closest-side,
      #fff 0%,
      color-mix(in srgb, var(--color) 55%, #fff) 9%,
      color-mix(in srgb, var(--color) 40%, transparent) 20%,
      transparent 34%
    );
    opacity: 0;
    animation: twinkle 8s ease-in-out infinite;
  }

  .sparkle::before,
  .sparkle::after {
    content: '';
    position: absolute;
    inset: 50% 0 auto;
    height: max(1px, calc(var(--unit) * 5));
    translate: 0 -50%;
    background: linear-gradient(90deg, transparent, #fff 50%, transparent);
  }

  /* The vertical ray is shorter than the horizontal one. */
  .sparkle::after {
    rotate: 90deg;
    scale: 0.62 1;
  }

  @keyframes breathe {
    50% {
      opacity: 0.8;
    }
  }

  @keyframes shimmer {
    50% {
      scale: 0.86 1;
      opacity: 0.65;
    }
  }

  /* The ray stretches a little from its inner end as it brightens. */
  @keyframes glow {
    0%,
    100% {
      opacity: 0;
      transform: scaleX(0.72);
    }
    50% {
      opacity: var(--level);
      transform: scaleX(1);
    }
  }

  @keyframes twinkle {
    0%,
    26%,
    100% {
      scale: 0.15;
      opacity: 0;
    }
    13% {
      scale: 1;
      opacity: 1;
    }
  }
</style>
