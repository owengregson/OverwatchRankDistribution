<!--
  The light effect behind a rank icon, as in game:

    soft     a small, faint glow                        (Emerald, Diamond)
    radiant  a larger, breathing glow                   (Master)
    flare    glow, a horizontal lens streak, a sparkle  (Grandmaster)
    blaze    a stronger flare with two sparkles         (Champion)

  Metal tiers have no effect and render nothing. Which tier gets which
  effect is set by `glow` in src/data/ladder.js.

  Sizes are in --unit (one source pixel of the icon artwork), inherited
  from RankBadge, so the effect scales with the badge.
-->
<script>
  let { effect, color } = $props();

  const hasFlare = $derived(effect === 'flare' || effect === 'blaze');
</script>

{#if effect}
  <span class="aura {effect}" style:--color={color} aria-hidden="true">
    <span class="glow"></span>
    {#if hasFlare}
      <span class="streak"></span>
      <span class="sparkle one"></span>
      {#if effect === 'blaze'}
        <span class="sparkle two"></span>
      {/if}
    {/if}
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

  .glow {
    width: calc(var(--unit) * var(--size));
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      color-mix(in srgb, var(--color) var(--strength), transparent),
      color-mix(in srgb, var(--color) calc(var(--strength) * 0.35), transparent) 55%,
      transparent
    );
  }

  .soft {
    --size: 520;
    --strength: 34%;
  }

  .radiant {
    --size: 660;
    --strength: 58%;
  }

  .flare {
    --size: 700;
    --strength: 62%;
  }

  .blaze {
    --size: 760;
    --strength: 74%;
  }

  .radiant .glow,
  .flare .glow,
  .blaze .glow {
    animation: breathe 4.2s ease-in-out infinite;
  }

  /* Lens streak: a thin bright line fading out to both sides. */
  .streak {
    width: calc(var(--unit) * 980);
    height: max(1px, calc(var(--unit) * 9));
    border-radius: 50%;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--color) 70%, transparent) 30%,
      #fff 50%,
      color-mix(in srgb, var(--color) 70%, transparent) 70%,
      transparent
    );
    filter: blur(calc(var(--unit) * 3));
    animation: shimmer 3.4s ease-in-out infinite;
  }

  .blaze .streak {
    width: calc(var(--unit) * 1120);
    height: max(1px, calc(var(--unit) * 12));
  }

  /* Four-point star that twinkles. */
  .sparkle {
    width: calc(var(--unit) * 110);
    aspect-ratio: 1;
    background: radial-gradient(closest-side, #fff 20%, color-mix(in srgb, var(--color) 60%, #fff) 60%, transparent);
    clip-path: polygon(50% 0, 56% 44%, 100% 50%, 56% 56%, 50% 100%, 44% 56%, 0 50%, 44% 44%);
    animation: twinkle 2.8s ease-in-out infinite;
  }

  .sparkle.one {
    left: calc(var(--unit) * 190);
    top: calc(var(--unit) * -70);
  }

  .sparkle.two {
    left: calc(var(--unit) * -200);
    top: calc(var(--unit) * 40);
    width: calc(var(--unit) * 80);
    animation-delay: -1.4s;
  }

  @keyframes breathe {
    50% {
      scale: 1.08;
      opacity: 0.78;
    }
  }

  @keyframes shimmer {
    50% {
      scale: 0.82 1;
      opacity: 0.6;
    }
  }

  @keyframes twinkle {
    0%,
    100% {
      scale: 0.35;
      rotate: 0deg;
      opacity: 0.25;
    }
    50% {
      scale: 1;
      rotate: 45deg;
      opacity: 1;
    }
  }
</style>
