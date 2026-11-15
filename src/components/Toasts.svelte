<script>
  import { flip } from 'svelte/animate';
  import { ms, pop, dissolve } from '@/lib/motion.js';
  import { toasts } from '@/lib/state/toasts.svelte.js';
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each toasts.items as toast (toast.id)}
    <button
      type="button"
      class="toast {toast.kind}"
      onclick={() => toasts.dismiss(toast.id)}
      in:pop={{ from: 0.8 }}
      out:dissolve
      animate:flip={{ duration: ms(240) }}
    >
      <span class="mark" aria-hidden="true"></span>
      {toast.message}
    </button>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    right: var(--gutter);
    bottom: var(--gutter);
    z-index: 50;
    display: grid;
    justify-items: end;
    gap: 8px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: min(420px, calc(100vw - 2 * var(--gutter)));
    padding: 10px 16px 10px 12px;
    background: linear-gradient(180deg, #1c2b62, #0d1637);
    border-left: 3px solid var(--good, #35d695);
    box-shadow: 0 14px 34px rgb(0 0 0 / 0.5);
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
    color: var(--ice-100);
    font-size: 13px;
    text-align: left;
    pointer-events: auto;
  }

  .toast.error {
    border-left-color: var(--orange-hot);
  }

  .mark {
    width: 8px;
    height: 8px;
    flex: none;
    rotate: 45deg;
    background: #35d695;
  }

  .error .mark {
    background: var(--orange-hot);
  }
</style>
