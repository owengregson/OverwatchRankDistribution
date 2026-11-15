<!--
  A rank as it appears in game: the tier icon with the division plate
  directly underneath, touching.

  Sizing: the icon files come in different shapes and are not drawn to one
  scale, so each is scaled until they all cover the same area of screen
  (see lib/ladder/iconSizing.js). No rank looks bigger than another, and
  the badge keeps one fixed box whatever icon is in it.

  `size` is the width of that box, wide enough for the widest icon: a
  number of CSS pixels, or any CSS length such as "var(--badge-size)" so a
  parent can size it responsively. A typical icon fills about three
  quarters of the width.

  Layers, back to front: the tier's light effect, the icon, the plate.
-->
<script>
  import RankAura from '@/components/RankAura.svelte';
  import { imageUrl } from '@/lib/assets.js';
  import { dissolve, pop, slide } from '@/lib/motion.js';
  import { iconSizing, ladder } from '@/lib/state/app.svelte.js';

  let {
    tier,
    /** Division number (5–1), or null to show the tier icon alone. */
    division = null,
    size = 64,
    /** Where the icon sits in its slot when there is no plate under it. */
    align = 'bottom',
    /** Animate when the tier or division changes. */
    animated = true,
    /** Show the tier's light effect (glow, flare, sparkles). Turn off for tiny icons. */
    effects = true,
  } = $props();

  const { box, plate } = iconSizing;
  const icon = $derived(iconSizing.icon(tier));
  const label = $derived(division ? `${tier.name} ${division}` : tier.name);
  const width = $derived(typeof size === 'number' ? `${size}px` : size);
</script>

<!--
  --px   CSS pixels per balanced pixel (the shared unit all icons are sized in)
  --unit CSS pixels per pixel of this icon's own file (what the light effect is measured in)
-->
<div
  class="badge"
  class:centered={align === 'center' && !division}
  role="img"
  aria-label={label}
  style:--px="calc({width} / {box.width})"
  style:--box-w={box.width}
  style:--box-h={box.height}
>
  <div class="slot icon-slot">
    {#key tier.id}
      <span
        class="art"
        style:--unit="calc(var(--px) * {icon.scale})"
        in:pop={{ duration: animated ? 260 : 0 }}
        out:dissolve={{ duration: animated ? 120 : 0 }}
      >
        {#if effects}
          <RankAura effect={tier.glow} color={tier.color} />
        {/if}
        <img
          class="icon"
          src={imageUrl(tier.icon)}
          alt=""
          draggable="false"
          style:width="calc(var(--px) * {icon.width})"
          style:height="calc(var(--px) * {icon.height})"
        />
      </span>
    {/key}
  </div>

  {#if division}
    <div
      class="slot plate-slot"
      style:width="calc(var(--px) * {plate.width})"
      style:height="calc(var(--px) * {plate.height})"
    >
      {#key division}
        <img
          class="plate"
          src={imageUrl(ladder.divisionIcon(division))}
          alt=""
          draggable="false"
          in:slide={{ duration: animated ? 200 : 0, y: -6 }}
          out:dissolve={{ duration: animated ? 100 : 0 }}
        />
      {/key}
    </div>
  {/if}
</div>

<style>
  /*
   * isolation makes the badge its own stack: the light effect (z-index -1)
   * sits at the bottom of it, under the icon and the plate, but still above
   * whatever is behind the badge.
   */
  .badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: calc(var(--px) * var(--box-w));
    flex: none;
    isolation: isolate;
  }

  /* Stack children on one grid cell so the old and new image can cross-fade. */
  .slot {
    display: grid;
  }

  .slot > * {
    grid-area: 1 / 1;
  }

  .icon-slot {
    width: 100%;
    height: calc(var(--px) * var(--box-h));
    place-items: end center;
  }

  .centered .icon-slot {
    place-items: center;
  }

  .art {
    position: relative;
    display: block;
  }

  .icon {
    filter: drop-shadow(0 calc(var(--unit) * 14) calc(var(--unit) * 22) rgb(0 0 0 / 0.45));
  }

  /* Always above the icon's light effect, including while the icon is animating in. */
  .plate-slot {
    position: relative;
    z-index: 1;
  }

  .plate {
    width: 100%;
    height: 100%;
  }
</style>
