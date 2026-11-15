<!--
  A submission's proof screenshot: a thumbnail that opens full size.
  Proof images are private; the backend hands out a short-lived address
  for each one, and only to a signed-in admin.
-->
<script>
  import { onMount } from 'svelte';
  import { backend } from '@/lib/backend/index.js';

  let { submission } = $props();

  let url = $state('');
  let failed = $state(false);
  let dialog = $state();

  onMount(async () => {
    try {
      url = await backend.getProofUrl(submission);
    } catch {
      failed = true;
    }
  });

  /** Clicking the dark area around the image closes it. */
  function closeOnBackdrop(event) {
    if (event.target === dialog) dialog.close();
  }
</script>

{#if failed}
  <span class="chip bad">No image</span>
{:else if !url}
  <span class="thumb loading" aria-label="Loading proof"></span>
{:else}
  <button type="button" class="thumb" onclick={() => dialog.showModal()} aria-label="View proof for {submission.rank}">
    <img src={url} alt="" draggable="false" />
    <span class="zoom">View</span>
  </button>

  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <dialog bind:this={dialog} onclick={closeOnBackdrop} aria-label="Proof for {submission.rank}">
    <figure>
      <img src={url} alt="Proof screenshot for {submission.rank}" draggable="false" />
      <figcaption>
        <span>{submission.rank} · claims better than {submission.betterThan}%</span>
        <button type="button" class="btn small" onclick={() => dialog.close()}>Close</button>
      </figcaption>
    </figure>
  </dialog>
{/if}

<style>
  .thumb {
    position: relative;
    display: block;
    width: 112px;
    height: 64px;
    overflow: hidden;
    border: 1px solid var(--line-strong);
    background: rgb(0 0 0 / 0.4);
    transition:
      border-color 200ms,
      transform 240ms var(--ease-back);
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: scale 400ms var(--ease-out);
  }

  button.thumb:hover {
    border-color: var(--ice-100);
    transform: translateY(-2px);
  }

  button.thumb:hover img {
    scale: 1.08;
  }

  .zoom {
    position: absolute;
    inset: auto 0 0;
    padding: 2px 0 1px;
    background: rgb(5 10 26 / 0.8);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ice-100);
    translate: 0 100%;
    transition: translate 240ms var(--ease-out);
  }

  button.thumb:hover .zoom,
  button.thumb:focus-visible .zoom {
    translate: 0 0;
  }

  .loading {
    animation: pulse 1.2s ease-in-out infinite;
  }

  dialog {
    max-width: min(1200px, 94vw);
    max-height: 94dvh;
    padding: 0;
    border: 1px solid var(--line-strong);
    background: var(--navy-900);
    color: var(--ice-100);
  }

  dialog[open] {
    animation: open 260ms var(--ease-out);
  }

  dialog::backdrop {
    background: rgb(3 6 18 / 0.82);
    backdrop-filter: blur(4px);
  }

  figure {
    display: grid;
    margin: 0;
  }

  figure img {
    max-width: 100%;
    max-height: calc(94dvh - 54px);
    object-fit: contain;
  }

  figcaption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 9px 12px 9px 16px;
    font-size: 13px;
  }

  @keyframes pulse {
    50% {
      opacity: 0.4;
    }
  }

  @keyframes open {
    from {
      opacity: 0;
      scale: 0.96;
    }
  }
</style>
