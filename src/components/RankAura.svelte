<!--
  The light effect behind a rank icon, as in game. Metal tiers have none;
  the rest are built from up to four layers, set per effect in EFFECTS:

    halo      a glow that hugs the icon
    streak    a long horizontal hairline of light through the icon
    rays      shorter, slightly thicker lines that flash in and out at an
              angle, each flash at a different angle (the lens-flare burst)
    sparkles  small crossed glints that swell in and fade out in place

  Which tier gets which effect is the tier's `glow` in src/data/ladder.js.

  All lengths are in source pixels of the icon artwork (an icon is about
  430 wide) and are multiplied by --unit, inherited from RankBadge, so the
  effect scales with the badge. Positions are measured from the icon's
  centre: x to the right, y downwards.
-->
<script>
  const EFFECTS = {
    // Emerald, Diamond
    soft: { halo: { reach: 580, peak: 36 } },
    // Master
    radiant: {
      halo: { reach: 680, peak: 78, breathes: true },
      sparkles: [{ x: 204, y: -18, span: 120 }],
    },
    // Grandmaster
    flare: {
      halo: { reach: 680, peak: 82, breathes: true },
      streak: { length: 1240, thickness: 5 },
      // Each ray flashes at its three angles in turn, one full cycle every `period` seconds.
      rays: {
        length: 760,
        thickness: 7,
        beams: [
          { angles: [-34, 24, -62], period: 7.5 },
          { angles: [31, -20, 58], period: 9.2 },
        ],
      },
      sparkles: [{ x: 214, y: -84, span: 150 }],
    },
    // Champion
    blaze: {
      halo: { reach: 720, peak: 92, breathes: true },
      streak: { length: 1380, thickness: 7 },
      rays: {
        length: 860,
        thickness: 9,
        beams: [
          { angles: [-58, -22, -40], period: 6.4 },
          { angles: [27, 61, 44], period: 7.8 },
          { angles: [-29, 36, -66], period: 8.9 },
          { angles: [64, -47, 18], period: 10.3 },
        ],
      },
      sparkles: [
        { x: -150, y: -82, span: 130 },
        { x: 202, y: 34, span: 100 },
      ],
    },
  };

  let { effect, color } = $props();

  const layers = $derived(EFFECTS[effect]);
</script>

{#if layers}
  <span class="aura" style:--color={color} aria-hidden="true">
    <span class="halo" class:breathes={layers.halo.breathes} style:--reach={layers.halo.reach} style:--peak="{layers.halo.peak}%"></span>

    {#if layers.rays}
      {#each layers.rays.beams as beam, i}
        <span
          class="beam ray"
          style:--length={layers.rays.length}
          style:--thickness={layers.rays.thickness}
          style:--angle-1="{beam.angles[0]}deg"
          style:--angle-2="{beam.angles[1]}deg"
          style:--angle-3="{beam.angles[2]}deg"
          style:animation-duration="{beam.period}s"
          style:animation-delay="{-i * 1.7}s"
        ></span>
      {/each}
    {/if}

    {#if layers.streak}
      <span class="beam streak" style:--length={layers.streak.length} style:--thickness={layers.streak.thickness}></span>
    {/if}

    {#each layers.sparkles ?? [] as sparkle, i}
      <span
        class="sparkle"
        style:--span={sparkle.span}
        style:left="calc(var(--unit) * {sparkle.x})"
        style:top="calc(var(--unit) * {sparkle.y})"
        style:animation-delay="{i * -1.5}s"
      ></span>
    {/each}
  </span>
{/if}

<style>
  /* Centred on the icon, behind it, and never part of the layout. */
  .aura {
    position: absolute;
    inset: 50% auto auto 50%;
    z-index: -1;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .aura > * {
    position: absolute;
    translate: -50% -50%;
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
  .beam {
    width: calc(var(--unit) * var(--length));
    height: max(1px, calc(var(--unit) * var(--thickness)));
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
   * A ray is invisible most of the time. Three times per cycle it shoots
   * out from the centre and retracts, each time at the next of its angles
   * and turning a few degrees while it is lit. It moves to the next angle
   * while invisible.
   */
  .ray {
    --drift: 5deg;
    opacity: 0;
    animation-name: flash;
    animation-timing-function: var(--ease-in-out);
  }

  /*
   * Sparkle: a bright point with two crossing hairline rays. It swells in
   * and fades out in place; it does not spin.
   */
  .sparkle {
    width: calc(var(--unit) * var(--span));
    aspect-ratio: 1;
    background: radial-gradient(
      closest-side,
      #fff 0%,
      color-mix(in srgb, var(--color) 55%, #fff) 9%,
      color-mix(in srgb, var(--color) 40%, transparent) 20%,
      transparent 34%
    );
    animation: twinkle 3s ease-in-out infinite;
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

  @keyframes flash {
    0% {
      rotate: var(--angle-1);
      scale: 0.25 1;
      opacity: 0;
    }
    11% {
      scale: 1 1;
      opacity: 0.9;
    }
    24% {
      rotate: calc(var(--angle-1) + var(--drift));
      scale: 0.25 1;
      opacity: 0;
    }
    33% {
      rotate: var(--angle-2);
      scale: 0.25 1;
      opacity: 0;
    }
    45% {
      scale: 1 1;
      opacity: 0.9;
    }
    58% {
      rotate: calc(var(--angle-2) - var(--drift));
      scale: 0.25 1;
      opacity: 0;
    }
    67% {
      rotate: var(--angle-3);
      scale: 0.25 1;
      opacity: 0;
    }
    79% {
      scale: 1 1;
      opacity: 0.9;
    }
    92%,
    100% {
      rotate: calc(var(--angle-3) + var(--drift));
      scale: 0.25 1;
      opacity: 0;
    }
  }

  @keyframes twinkle {
    0%,
    100% {
      scale: 0.15;
      opacity: 0;
    }
    50% {
      scale: 1;
      opacity: 1;
    }
  }
</style>
