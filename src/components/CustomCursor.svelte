<!--
  Draws the site's cursor as an element that follows the mouse, and hides
  the system cursor while it does.

  Why not plain CSS `cursor: url(...)`? Chrome drops any custom cursor
  image the moment part of it would fall outside the page (so it cannot be
  used to cover the browser's own controls), and shows the system cursor
  instead. With an image cursor that happened across the whole footer and
  along the right edge. An element inside the page is simply clipped at the
  edge, like everything else, so the cursor stays the same everywhere.

  Which cursor to show comes from CSS: the `--cursor` property of whatever
  is under the mouse (see src/styles/cursors.css). The images, their size
  and hotspots are in src/lib/cursor/cursors.js.

  Only used with a mouse or trackpad. Touch screens keep their normal
  behaviour, and so do the browser's own scrollbars and dropdown lists.
-->
<script>
  import { onMount } from 'svelte';
  import { CURSOR_SCALE, CURSORS } from '@/lib/cursor/cursors.js';

  /** While this class is on <html>, cursors.css hides the system cursor. */
  const ACTIVE_CLASS = 'custom-cursor';

  let element = $state();
  let kind = $state('default');
  let visible = $state(false);
  let pressed = $state(false);

  onMount(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const root = document.documentElement;
    let lastTarget = null;
    let lastModal = null;
    let x = 0;
    let y = 0;

    // A popover sits in the browser's top layer, above every z-index.
    element.showPopover?.();

    /** The cursor an element asks for through its (inherited) --cursor property. */
    function kindOf(target) {
      if (!(target instanceof Element)) return 'default';
      const name = getComputedStyle(target).getPropertyValue('--cursor').trim();
      return name in CURSORS ? name : 'default';
    }

    /**
     * A modal <dialog> or another popover (a dropdown's list) opened after
     * us would cover the cursor, because the top layer stacks in opening
     * order. Re-open the popover to go back on top.
     */
    function stayAboveDialogs() {
      const others = [...document.querySelectorAll(':modal, :popover-open')].filter((other) => other !== element);
      const modal = others.at(-1) ?? null;
      if (modal === lastModal) return;
      lastModal = modal;
      if (modal && element.showPopover) {
        element.hidePopover();
        element.showPopover();
      }
    }

    function show() {
      if (visible) return;
      visible = true;
      root.classList.add(ACTIVE_CLASS);
    }

    /** Hand back to the system cursor. */
    function hide() {
      if (!visible) return;
      visible = false;
      pressed = false;
      lastTarget = null;
      root.classList.remove(ACTIVE_CLASS);
    }

    function onpointermove(event) {
      if (event.pointerType === 'touch') return hide();

      x = event.clientX;
      y = event.clientY;
      // Over the page's own scrollbars the browser insists on its arrow.
      if (x >= root.clientWidth || y >= root.clientHeight) return hide();

      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (event.target !== lastTarget) {
        lastTarget = event.target;
        kind = kindOf(lastTarget);
      }
      stayAboveDialogs();
      show();
    }

    function onpointerdown(event) {
      if (event.pointerType === 'touch') return;
      // A dropdown's list is drawn by the system, with the system cursor.
      if (event.target instanceof Element && event.target.closest('select')) return hide();
      pressed = true;
    }

    function onpointerup() {
      pressed = false;
      // A click often changes what is under the mouse (a new page, a button
      // that is now disabled) without the mouse moving. Look again once the
      // page has settled.
      setTimeout(() => {
        if (!visible) return;
        lastTarget = document.elementFromPoint(x, y);
        kind = kindOf(lastTarget);
        // The click may have opened a dropdown's list on top of the cursor.
        stayAboveDialogs();
      }, 120);
    }

    /**
     * pointerleave does not bubble, but a capturing listener on <html> still
     * hears it for every element inside. Those fire, with no mouse movement
     * to follow, when the chart captures the pointer on a click, and hiding
     * on them let the system cursor flash through. Only <html> itself
     * losing the pointer means the mouse left the page.
     */
    function onpointerleave(event) {
      if (event.target === root) hide();
    }

    const options = { capture: true, passive: true };
    window.addEventListener('pointermove', onpointermove, options);
    window.addEventListener('pointerdown', onpointerdown, options);
    window.addEventListener('pointerup', onpointerup, options);
    window.addEventListener('pointercancel', onpointerup, options);
    // No pointer events arrive while a file is dragged in, or once the mouse is outside the page.
    window.addEventListener('dragenter', hide, options);
    root.addEventListener('pointerleave', onpointerleave, options);

    return () => {
      hide();
      window.removeEventListener('pointermove', onpointermove, options);
      window.removeEventListener('pointerdown', onpointerdown, options);
      window.removeEventListener('pointerup', onpointerup, options);
      window.removeEventListener('pointercancel', onpointerup, options);
      window.removeEventListener('dragenter', hide, options);
      root.removeEventListener('pointerleave', onpointerleave, options);
    };
  });
</script>

<div class="cursor" class:visible class:pressed bind:this={element} popover="manual" aria-hidden="true">
  <div class="art">
    <!-- All three images stay loaded and stacked; only the current one is shown, so switching never flickers. -->
    {#each Object.entries(CURSORS) as [name, cursor] (name)}
      <img
        class:current={name === kind}
        src={cursor.src}
        alt=""
        draggable="false"
        width={cursor.width / CURSOR_SCALE}
        height={cursor.height / CURSOR_SCALE}
        style:left="{-cursor.hotspot[0] / CURSOR_SCALE}px"
        style:top="{-cursor.hotspot[1] / CURSOR_SCALE}px"
      />
    {/each}
  </div>
</div>

<style>
  /*
   * A zero-size box whose top-left corner is the pointing position; each
   * image is offset so its hotspot lands on that corner. These rules also
   * undo the browser's default popover styling (centred, bordered, padded).
   */
  .cursor {
    position: fixed;
    inset: 0 auto auto 0;
    z-index: 2147483647;
    width: 0;
    height: 0;
    margin: 0;
    padding: 0;
    border: 0;
    overflow: visible;
    background: none;
    pointer-events: none;
    visibility: hidden;
    will-change: transform;
  }

  .cursor.visible {
    visibility: visible;
  }

  /* A small dip when the button goes down, pivoting on the pointing position. */
  .art {
    transform-origin: 0 0;
    transition: scale 110ms var(--ease-out);
  }

  .pressed .art {
    scale: 0.9;
  }

  img {
    position: absolute;
    max-width: none;
    opacity: 0;
  }

  img.current {
    opacity: 1;
  }
</style>
