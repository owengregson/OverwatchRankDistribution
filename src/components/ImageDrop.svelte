<!--
  Image input: drop a file on it, paste one from the clipboard anywhere on
  the page, or browse for one. The chosen image is prepared for upload
  (see lib/image.js) and exposed through `value`:
  { blob, extension, width, height } or null.

  `onchange(file)` fires with the file as it was chosen, before it was
  shrunk (or null when the image is removed), for anything that wants to
  look at the original. `chip` ({ text, tone }) replaces the "Ready to
  send" label beside the preview, e.g. while the screenshot is being read,
  and `note` is a line or two of text under it. `fine` is the small print
  under the prompt. `busy` (bindable) is true while an image is prepared.

  The box is the same size whether it is empty or holds an image: the
  prompt stays in place, unseen, and the preview is laid over it. Nothing
  around it moves when an image is added.
-->
<script>
  import { ACCEPTED_TYPES, formatBytes, prepareImage } from '@/lib/image.js';
  import { pop, slide } from '@/lib/motion.js';

  let {
    value = $bindable(null),
    invalid = false,
    chip = { text: 'Ready to send', tone: 'good' },
    note = '',
    fine = 'PNG, JPEG or WebP. It is shrunk and stripped of hidden details before it is sent.',
    /** True while a chosen image is being prepared; bind it to show that elsewhere. */
    busy = $bindable(false),
    onchange,
  } = $props();

  let over = $state(false);
  let problem = $state('');
  let previewUrl = $state('');
  /** dragenter and dragleave also fire for child elements; count them to know when the drag really left. */
  let dragDepth = 0;

  // Keep an object URL for the preview, and release it when the image changes or the component goes away.
  $effect(() => {
    if (!value) {
      previewUrl = '';
      return;
    }
    const url = URL.createObjectURL(value.blob);
    previewUrl = url;
    return () => URL.revokeObjectURL(url);
  });

  async function take(file) {
    if (!file) return;
    busy = true;
    problem = '';
    try {
      value = await prepareImage(file);
      onchange?.(file);
    } catch (error) {
      problem = error.message;
    } finally {
      busy = false;
    }
  }

  const firstImage = (files) => [...(files ?? [])].find((file) => file.type.startsWith('image/'));

  function ondrop(event) {
    event.preventDefault();
    dragDepth = 0;
    over = false;
    const file = firstImage(event.dataTransfer?.files);
    if (file) take(file);
    else problem = 'That was not an image file.';
  }

  function ondragenter(event) {
    event.preventDefault();
    dragDepth += 1;
    over = true;
  }

  function ondragleave() {
    dragDepth = Math.max(0, dragDepth - 1);
    over = dragDepth > 0;
  }

  function onpaste(event) {
    const file = firstImage(event.clipboardData?.files);
    if (!file) return;
    event.preventDefault();
    take(file);
  }

  function remove() {
    value = null;
    problem = '';
    onchange?.(null);
  }
</script>

<svelte:window {onpaste} />

<div
  class="drop"
  class:over
  class:filled={value}
  class:invalid={invalid || problem}
  role="group"
  aria-label="Screenshot"
  {ondrop}
  {ondragenter}
  {ondragleave}
  ondragover={(event) => event.preventDefault()}
>
  <!-- Always here, so the box keeps this size; out of sight and out of reach while something is laid over it. -->
  <div class="empty" class:covered={busy || value} inert={busy || Boolean(value)}>
    <svg class="glyph" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 12h32v24H8z" />
      <path d="m8 31 9-9 7 7 6-6 10 10" />
      <circle cx="31" cy="19" r="3" />
    </svg>
    <p class="prompt">
      <b>Drop a screenshot here</b>, paste it with <kbd>Ctrl</kbd> <kbd>V</kbd>, or
      <label class="browse">
        browse
        <input type="file" accept={ACCEPTED_TYPES.join(',')} onchange={(e) => take(e.currentTarget.files[0])} />
      </label>
    </p>
    <p class="fine">{fine}</p>
  </div>

  {#if busy}
    <p class="over-box status">Preparing image…</p>
  {:else if value}
    <div class="over-box chosen" in:pop={{ from: 0.92 }}>
      <img src={previewUrl} alt="Your screenshot" draggable="false" />
      <div class="about">
        <span class="facts">
          <span class="chip {chip.tone}">{chip.text}</span>
          <span class="numeric">{value.width} × {value.height} · {formatBytes(value.blob.size)}</span>
        </span>
        {#if note}
          <span class="note" aria-live="polite">{note}</span>
        {/if}
        <span class="actions">
          <label class="btn small">
            Replace
            <input type="file" accept={ACCEPTED_TYPES.join(',')} onchange={(e) => take(e.currentTarget.files[0])} />
          </label>
          <button type="button" class="btn small danger" onclick={remove}>Remove</button>
        </span>
      </div>
    </div>
  {/if}
</div>

{#if problem}
  <p class="problem" role="alert" in:slide>{problem}</p>
{/if}

<style>
  .drop {
    position: relative;
    border: 1px dashed var(--line-strong);
    background: rgb(5 10 26 / 0.45);
    transition:
      border-color 200ms,
      background 200ms,
      scale 240ms var(--ease-back);
  }

  .drop.filled {
    border-style: solid;
  }

  /* The prompt sets the size of the box. */
  .empty {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 6px;
    min-height: 136px;
    padding: 22px 18px;
    text-align: center;
  }

  .empty.covered {
    visibility: hidden;
  }

  /* The preview, and the note while an image is prepared, lie over the prompt and fill the box. */
  .over-box {
    position: absolute;
    inset: 12px;
  }

  .drop.invalid {
    border-color: var(--orange-hot);
  }

  /* Something is being dragged over the zone. */
  .drop.over {
    border-color: var(--tier, var(--ice-100));
    background: color-mix(in srgb, var(--tier, var(--ice-100)) 12%, transparent);
    scale: 1.01;
  }

  .glyph {
    width: 40px;
    height: 40px;
    fill: none;
    stroke: var(--ice-400);
    stroke-width: 2.5;
    stroke-linejoin: round;
    transition:
      stroke 200ms,
      translate 300ms var(--ease-back);
  }

  .over .glyph {
    stroke: var(--ice-50);
    translate: 0 -4px;
  }

  .prompt {
    color: var(--ice-300);
  }

  .prompt b {
    color: var(--ice-50);
  }

  kbd {
    padding: 1px 5px 0;
    border: 1px solid var(--line-strong);
    border-bottom-width: 2px;
    border-radius: 3px;
    font: inherit;
    font-size: 11px;
    color: var(--ice-200);
  }

  .browse {
    color: var(--orange-hot);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .browse:hover {
    color: var(--ice-50);
  }

  /* The real file inputs are invisible; their labels are what you click. */
  input[type='file'] {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  label:focus-within {
    outline: 2px solid var(--orange-hot);
    outline-offset: 2px;
  }

  .fine {
    font-size: 11px;
    color: var(--ice-500);
  }

  .status {
    display: grid;
    place-items: center;
    color: var(--ice-300);
  }

  .chosen {
    display: grid;
    grid-template-columns: minmax(0, 200px) 1fr;
    grid-template-rows: minmax(0, 1fr);
    align-items: center;
    gap: 16px;
  }

  /* The image fits the height the box already has, whatever its shape. */
  .chosen img {
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: contain;
    background: rgb(0 0 0 / 0.35);
  }

  .about {
    display: grid;
    justify-items: start;
    gap: 7px;
    min-width: 0;
    font-size: 12px;
    color: var(--ice-300);
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
  }

  .note {
    font-size: 11px;
    line-height: 1.35;
    color: var(--ice-200);
    text-wrap: pretty;
  }

  .actions {
    display: flex;
    gap: 6px;
  }

  .problem {
    margin-top: 6px;
    font-size: 11px;
    color: var(--orange-hot);
  }
</style>
