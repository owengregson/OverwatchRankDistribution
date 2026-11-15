<!--
  A dropdown in the site's own style, in place of the browser's <select>.

  The browser draws a <select>'s list itself, outside the page: it cannot be
  styled and the system cursor shows over it. This one is a button that
  opens a list the page draws. The list is a popover, so it sits in the
  browser's top layer and is not cut off by the chamfered panels.

  Keyboard, as for a native dropdown: Enter, Space or an arrow key opens it;
  arrows, Home and End move; Enter or Space picks; Escape or Tab closes;
  typing jumps to the option that starts with what was typed.

  `options` is a list of { value, label }. An option may also have an
  `icon`, the address of a one-colour image drawn before its label
  (Glyph.svelte).

  As a menu: with a `caption` the button always reads that, whatever is
  chosen, and with `bare` it has none of a field's styling, so the parent
  can dress it as its own (the header's "Older Seasons" tab). A bare
  dropdown's list is as wide as its longest option, not as its button.
-->
<script>
  import { tick } from 'svelte';
  import Glyph from '@/components/Glyph.svelte';

  let {
    value = $bindable(),
    options,
    label = undefined,
    title = undefined,
    caption = undefined,
    compact = false,
    bare = false,
    disabled = false,
    onchange,
  } = $props();

  /** Gap (px) between the button and its list, and between the list and the edge of the window. */
  const GAP = 4;
  /** How long (ms) typed letters keep adding to the same search. */
  const TYPING_PAUSE = 700;

  const id = $props.id();
  let trigger = $state();
  let list = $state();
  let open = $state(false);
  /** Index of the option the keyboard is on while the list is open. */
  let active = $state(0);
  /** Where the list is drawn, in window coordinates. */
  let place = $state({ left: 0, top: 0, width: 0, maxHeight: 0, above: false });
  let typed = '';
  let typedAt = 0;

  const selectedIndex = $derived(Math.max(0, options.findIndex((option) => option.value === value)));
  const selected = $derived(options[selectedIndex]);

  /** Puts the list under the button, or above it when there is more room there. */
  function position() {
    const box = trigger.getBoundingClientRect();
    const below = window.innerHeight - box.bottom - GAP * 2;
    const above = box.top - GAP * 2;
    const flip = below < Math.min(list.scrollHeight, 180) && above > below;
    place = {
      left: box.left,
      width: box.width,
      above: flip,
      top: flip ? box.top - GAP : box.bottom + GAP,
      maxHeight: Math.max(80, flip ? above : below),
    };
  }

  async function show() {
    if (disabled || open) return;
    active = selectedIndex;
    open = true;
    await tick();
    list.showPopover?.();
    position();
    reveal();
  }

  function hide() {
    if (!open) return;
    open = false;
    list.hidePopover?.();
  }

  function pick(index) {
    const option = options[index];
    hide();
    trigger.focus();
    if (!option || option.value === value) return;
    value = option.value;
    onchange?.(option.value);
  }

  /** Scrolls the list so the option the keyboard is on can be seen. */
  function reveal() {
    list?.children[active]?.scrollIntoView({ block: 'nearest' });
  }

  function move(to) {
    active = Math.min(options.length - 1, Math.max(0, to));
    reveal();
  }

  /** The first option whose label starts with the letters typed in quick succession. */
  function search(key) {
    const now = Date.now();
    typed = now - typedAt > TYPING_PAUSE ? key : typed + key;
    typedAt = now;
    const found = options.findIndex((option) => option.label.toLowerCase().startsWith(typed.toLowerCase()));
    if (found < 0) return;
    if (open) move(found);
    else pick(found);
  }

  function onkeydown(event) {
    const { key } = event;
    if (key.length === 1 && key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      return search(key);
    }
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    const steps = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: options.length - 1 };
    if (key in steps) {
      event.preventDefault();
      move(steps[key]);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      pick(active);
    } else if (key === 'Escape') {
      event.preventDefault();
      hide();
    } else if (key === 'Tab') {
      hide();
    }
  }

  /** A press anywhere but on this dropdown closes it. */
  function onpointerdown(event) {
    if (open && !trigger.contains(event.target) && !list.contains(event.target)) hide();
  }

  $effect(() => {
    if (disabled) hide();
  });
</script>

<svelte:window {onpointerdown} onresize={() => open && position()} onscrollcapture={() => open && position()} />

<button
  bind:this={trigger}
  type="button"
  class="trigger"
  class:input={!bare}
  class:bare
  class:compact
  class:open
  role="combobox"
  aria-haspopup="listbox"
  aria-expanded={open}
  aria-controls="{id}-list"
  aria-activedescendant={open ? `${id}-${active}` : undefined}
  aria-label={label}
  {title}
  {disabled}
  onclick={() => (open ? hide() : show())}
  {onkeydown}
>
  {#if !caption && selected?.icon}<Glyph src={selected.icon} />{/if}
  <span class="current">{caption ?? selected?.label ?? ''}</span>
  <svg class="chevron" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" /></svg>
</button>

{#if open}
  <div
    bind:this={list}
    id="{id}-list"
    class="list"
    class:compact
    class:above={place.above}
    role="listbox"
    aria-label={label}
    popover="manual"
    style:left="{place.left}px"
    style:top="{place.top}px"
    style:width={bare ? 'max-content' : `${place.width}px`}
    style:min-width="{place.width}px"
    style:max-height="{place.maxHeight}px"
  >
    {#each options as option, i (option.value)}
      <!-- The button keeps the focus, so options are picked with the mouse here and the keyboard there. -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        id="{id}-{i}"
        class="option"
        class:active={i === active}
        class:selected={option.value === value}
        role="option"
        tabindex="-1"
        aria-selected={option.value === value}
        onpointerenter={() => (active = i)}
        onclick={() => pick(i)}
      >
        {#if option.icon}<span class="mark"><Glyph src={option.icon} /></span>{/if}{option.label}
      </div>
    {/each}
  </div>
{/if}

<style>
  .trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    text-align: left;
  }

  .trigger.open {
    border-color: var(--ice-100);
  }

  .trigger:disabled {
    opacity: 0.5;
  }

  .current {
    /* Takes the room between an option's icon and the arrow, so the icon stays beside its label. */
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    flex: none;
    width: 10px;
    height: 6px;
    fill: none;
    stroke: var(--ice-300);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition:
      rotate 220ms var(--ease-out),
      stroke 180ms;
  }

  .open .chevron {
    rotate: 180deg;
    stroke: var(--orange-hot);
  }

  /* Bare: the arrow takes the colour of the text the parent gives the button. */
  .bare:not(.open) .chevron {
    stroke: currentColor;
  }

  /* The list is a popover: the browser centres those by default, so every position is set here. */
  .list {
    --cut: 8px;
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 4px;
    overflow-y: auto;
    border: 1px solid var(--line-strong);
    background: linear-gradient(180deg, var(--navy-700), var(--navy-900));
    box-shadow: 0 14px 34px rgb(0 0 0 / 0.5);
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%);
    color: var(--ice-100);
    font-size: 14px;
    scrollbar-width: thin;
    scrollbar-color: var(--navy-500) transparent;
    animation: unfold 160ms var(--ease-out);
  }

  .list.above {
    translate: 0 -100%;
    animation-name: unfold-up;
  }

  .list.compact {
    font-size: 13px;
  }

  @keyframes unfold {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
  }

  @keyframes unfold-up {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }

  .option {
    --cursor: link;
    cursor: pointer;
    position: relative;
    padding: 8px 10px 7px 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ice-200);
    transition:
      background 120ms,
      color 120ms;
  }

  .compact .option {
    padding: 6px 8px 5px 12px;
  }

  /* An option's icon, before its label. */
  .mark {
    margin-right: 8px;
  }

  /* A bar down the left edge marks the option in use. */
  .option::before {
    content: '';
    position: absolute;
    inset: 4px auto 4px 4px;
    width: 3px;
    background: var(--orange);
    scale: 1 0;
    transition: scale 160ms var(--ease-out);
  }

  .option.selected {
    color: var(--ice-50);
  }

  .option.selected::before {
    scale: 1;
  }

  .option.active {
    background: var(--ice-100);
    color: var(--navy-900);
  }

  @media (prefers-reduced-motion: reduce) {
    .list {
      animation: none;
    }
  }
</style>
