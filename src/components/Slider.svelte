<!--
  A slider in the site's style: a slanted track that fills with the tier
  colour, a diamond for a handle, and the value beside it.

  It is a native range input underneath, so the keyboard, touch and screen
  readers work as they do anywhere else; only its looks are replaced.
  The colour comes from `--tier` (or `--color`) on an ancestor.

  `format` turns the value into what is written beside the rail and read
  out, for a slider whose positions stand for something else (divisions run
  5 to 1 from left to right). `compact` is the smaller size for a dense form.
-->
<script>
  import { untrack } from 'svelte';
  import { linear } from 'svelte/easing';
  import { Tween, prefersReducedMotion } from 'svelte/motion';

  let {
    value = $bindable(0),
    min = 0,
    max = 100,
    step = 1,
    label,
    unit = '%',
    format = (value) => value,
    compact = false,
    disabled = false,
    oninput,
  } = $props();

  /**
   * How the drawn handle travels to the value when it jumps: a click
   * somewhere on the rail, an arrow key, a value filled in from outside.
   *
   * It moves at once, reaches full speed a fifth of the way through the
   * time (PEAK), then slows at a steady rate until it stops. That start is
   * what makes it feel answered straight away; the steady slowing is what
   * keeps the end brisk, where the usual ease-out curves crawl over their
   * last few pixels. A short hop takes SHORT ms and a sweep of the whole
   * rail LONG ms, so small moves are not drawn out.
   */
  const PEAK = 0.2;
  const SHORT = 130;
  const LONG = 300;
  const travel = (t) => (t < PEAK ? (t * t) / PEAK : 1 - (1 - t) ** 2 / (1 - PEAK));
  /** While it is dragged the handle chases the pointer this closely (ms): too short to see, enough to hide a jolt. */
  const CHASE = 45;

  /** How far along the rail the value is, 0 to 1. */
  const at = $derived((value - min) / (max - min));
  /** Where the handle is drawn: it travels towards `at`. */
  const drawn = new Tween(untrack(() => at));
  /** A press that has started to move is a drag; the press itself is a jump to that point. */
  let pressed = false;
  let dragging = $state(false);

  $effect(() => {
    const to = at;
    const distance = Math.abs(to - untrack(() => drawn.current));
    if (prefersReducedMotion.current) drawn.set(to, { duration: 0 });
    else if (dragging) drawn.set(to, { duration: CHASE, easing: linear });
    else drawn.set(to, { duration: SHORT + (LONG - SHORT) * Math.min(1, distance), easing: travel });
  });

  const release = () => {
    pressed = false;
    dragging = false;
  };
</script>

<svelte:window onpointerup={release} onpointercancel={release} />

<div class="slider" class:compact class:disabled style:--at={drawn.current}>
  <div class="rail">
    <div class="track"><div class="fill"></div></div>
    <!-- Quarter marks under the track. -->
    <div class="ticks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="handle" aria-hidden="true"></div>
    <input
      type="range"
      {min}
      {max}
      {step}
      {disabled}
      aria-label={label}
      aria-valuetext="{format(value)}{unit}"
      bind:value
      {oninput}
      onpointerdown={() => (pressed = true)}
      onpointermove={() => (dragging = pressed)}
    />
  </div>
  <output class="display numeric">{format(value)}<small>{unit}</small></output>
</div>

<style>
  .slider {
    --accent: var(--tier, var(--color, var(--orange)));
    --handle: 18px;
    /* Where the middle of the handle is: it travels between the ends of the rail, staying inside it. */
    --reach: calc(var(--handle) / 2 + (100% - var(--handle)) * var(--at));
    display: grid;
    grid-template-columns: minmax(0, 1fr) 64px;
    align-items: center;
    gap: 14px;
  }

  .rail {
    position: relative;
    height: 30px;
  }

  /* Slanted at both ends, like the game's progress bars. */
  .track {
    position: absolute;
    inset: 9px 0;
    overflow: hidden;
    border: 1px solid var(--line-strong);
    background: rgb(5 10 26 / 0.55);
    transform: skewX(-18deg);
  }

  .fill {
    width: var(--reach);
    height: 100%;
    background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 55%, transparent), var(--accent));
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 60%, transparent);
    transition: background 300ms;
  }

  .ticks {
    position: absolute;
    inset: auto 0 2px;
    display: flex;
    justify-content: space-between;
    padding-inline: calc(var(--handle) / 2);
  }

  .ticks i {
    width: 1px;
    height: 4px;
    background: var(--line-strong);
  }

  .handle {
    position: absolute;
    top: 50%;
    left: var(--reach);
    width: var(--handle);
    height: var(--handle);
    border: 2px solid var(--navy-950);
    background: var(--ice-50);
    box-shadow: 0 0 0 1px var(--accent), 0 0 14px color-mix(in srgb, var(--accent) 70%, transparent);
    translate: -50% -50%;
    rotate: 45deg;
    transition:
      scale 200ms var(--ease-back),
      background 180ms;
  }

  .rail:hover .handle,
  input:focus-visible ~ .handle {
    scale: 1.15;
  }

  input:active ~ .handle {
    scale: 0.92;
    background: var(--accent);
  }

  /* The real control lies invisibly over the rail and takes the input. */
  input {
    --cursor: link;
    cursor: pointer;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
  }

  /* Its own handle is as wide as the drawn one, so the two stay in step. */
  input::-webkit-slider-thumb {
    width: var(--handle);
    height: 30px;
  }

  input::-moz-range-thumb {
    width: var(--handle);
    height: 30px;
    border: 0;
  }

  .rail:has(input:focus-visible) .track {
    border-color: var(--ice-100);
    box-shadow: 0 0 0 3px rgb(160 185 255 / 0.16);
  }

  output {
    font-size: 30px;
    line-height: 1;
    color: var(--ice-50);
    text-align: right;
  }

  small {
    margin-left: 2px;
    font-size: 0.6em;
    color: var(--ice-300);
  }

  .disabled input {
    --cursor: default;
    cursor: default;
  }

  /* Compact: a shorter figure beside the rail, for a row of controls. */
  .compact {
    grid-template-columns: minmax(0, 1fr) 40px;
    gap: 8px;
  }

  .compact output {
    font-size: 22px;
  }
</style>
