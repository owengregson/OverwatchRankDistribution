<!--
  A rank as it appears in game: the tier icon with the division plate
  directly underneath, touching.

  Sizing: the icon files are tight crops of artwork drawn on one shared
  canvas, so they have different widths and heights. Every icon is drawn at
  the same scale (source pixels × --unit) inside a slot the size of that
  canvas. No tier is stretched to fill, so none looks bigger than another,
  and the slot keeps a fixed height whatever icon is in it.

  `size` is the width of the canvas in CSS pixels.
-->
<script>
  import { imageUrl } from '@/lib/assets.js';
  import { dissolve, pop, slide } from '@/lib/motion.js';
  import { ladder } from '@/lib/state/app.svelte.js';

  /** Division plate width relative to the icon canvas, matched to the in-game badge. */
  const DIVISION_SCALE = 0.92;

  let {
    tier,
    /** Division number (5–1), or null to show the tier icon alone. */
    division = null,
    size = 64,
    /** Where the icon sits in its slot when there is no plate under it. */
    align = 'bottom',
    /** Animate when the tier or division changes. */
    animated = true,
  } = $props();

  const canvas = ladder.iconCanvas;
  const plate = ladder.divisionIcon;
  const label = $derived(division ? `${tier.name} ${division}` : tier.name);
</script>

<div
  class="badge"
  class:centered={align === 'center' && !division}
  role="img"
  aria-label={label}
  style:--unit="{size / canvas.width}px"
  style:--canvas-w={canvas.width}
  style:--canvas-h={canvas.height}
>
  <div class="slot icon-slot">
    {#key tier.id}
      <img
        class="icon"
        src={imageUrl(tier.icon.file)}
        alt=""
        draggable="false"
        style:width="calc(var(--unit) * {tier.icon.width})"
        style:height="calc(var(--unit) * {tier.icon.height})"
        in:pop={{ duration: animated ? 260 : 0 }}
        out:dissolve={{ duration: animated ? 120 : 0 }}
      />
    {/key}
  </div>

  {#if division}
    <div
      class="slot plate-slot"
      style:width="calc(var(--unit) * {canvas.width * DIVISION_SCALE})"
      style:aspect-ratio="{plate.width} / {plate.height}"
    >
      {#key division}
        <img
          class="plate"
          src={imageUrl(plate.file(division))}
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
  .badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: calc(var(--unit) * var(--canvas-w));
    flex: none;
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
    height: calc(var(--unit) * var(--canvas-h));
    place-items: end center;
  }

  .centered .icon-slot {
    place-items: center;
  }

  .icon {
    filter: drop-shadow(0 calc(var(--unit) * 14) calc(var(--unit) * 22) rgb(0 0 0 / 0.45));
  }

  .plate {
    width: 100%;
    height: 100%;
  }
</style>
