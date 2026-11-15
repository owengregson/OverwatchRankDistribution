<!--
  Admin panel: review submissions and manage every datapoint and season
  behind the curves. Reached at /#/admin, which the submit page links to.

  What an admin may do is enforced by the backend. This page only decides
  what to show.
-->
<script>
  import { onMount } from 'svelte';
  import AdminLogin from '@/components/admin/AdminLogin.svelte';
  import DatapointManager from '@/components/admin/DatapointManager.svelte';
  import ReviewQueue from '@/components/admin/ReviewQueue.svelte';
  import SeasonManager from '@/components/admin/SeasonManager.svelte';
  import { backend } from '@/lib/backend/index.js';
  import { slide } from '@/lib/motion.js';
  import { app } from '@/lib/state/app.svelte.js';
  import { toasts } from '@/lib/state/toasts.svelte.js';

  const TABS = [
    { id: 'review', label: 'Review queue', view: ReviewQueue },
    { id: 'datapoints', label: 'Datapoints', view: DatapointManager },
    { id: 'seasons', label: 'Seasons', view: SeasonManager },
  ];

  /** undefined while checking, null when signed out, { email } when signed in. */
  let session = $state(undefined);
  let tabId = $state('review');
  let pendingCount = $state(null);

  const tab = $derived(TABS.find((t) => t.id === tabId));

  onMount(async () => {
    try {
      session = await backend.getSession();
      if (session) await app.refreshSeasons();
    } catch {
      session = null;
    }
  });

  async function signOut() {
    await backend.signOut();
    session = null;
    toasts.success('Signed out.');
  }
</script>

<main>
  {#if session === undefined}
    <p class="checking">Checking sign-in…</p>
  {:else if session === null}
    <AdminLogin onsignin={(next) => (session = next)} />
  {:else}
    <section class="panel board rise" aria-labelledby="admin-title">
      <header>
        <div>
          <p class="eyebrow">
            Signed in as {session.email}
            {#if backend.name === 'local'}<span class="chip warn">Development data, this browser only</span>{/if}
          </p>
          <h1 id="admin-title" class="display slanted">Model <em>control</em></h1>
        </div>
        <button type="button" class="btn small" onclick={signOut}>Sign out</button>
      </header>

      <div class="tabs" role="tablist" aria-label="Admin sections">
        {#each TABS as option (option.id)}
          <button type="button" role="tab" aria-selected={option.id === tabId} class:selected={option.id === tabId} onclick={() => (tabId = option.id)}>
            {option.label}
            {#if option.id === 'review' && pendingCount}
              <span class="count numeric">{pendingCount}</span>
            {/if}
          </button>
        {/each}
      </div>

      {#key tabId}
        <div class="view" in:slide>
          <tab.view onpendingcount={(count) => (pendingCount = count)} />
        </div>
      {/key}
    </section>
  {/if}
</main>

<style>
  main {
    flex: 1;
    width: min(1240px, 100%);
    margin-inline: auto;
    padding: calc(var(--gutter) * 1.4) var(--gutter) var(--gutter);
  }

  .checking {
    padding: 12vh 0;
    text-align: center;
    color: var(--ice-400);
  }

  .board {
    display: grid;
    gap: 18px;
    padding: 26px 28px 30px;
  }

  header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .eyebrow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  h1 {
    margin-top: 4px;
    font-size: clamp(40px, 4.4vw, 60px);
    font-style: italic;
  }

  h1 em {
    font-style: inherit;
    color: var(--orange-hot);
  }

  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--line);
  }

  .tabs button {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    color: var(--ice-400);
    font-size: 14px;
    transition: color 180ms;
  }

  .tabs button::after {
    content: '';
    position: absolute;
    inset: auto 0 -1px;
    height: 3px;
    background: var(--orange);
    scale: 0 1;
    transition: scale 300ms var(--ease-out);
  }

  .tabs button:hover,
  .tabs button.selected {
    color: var(--ice-50);
  }

  .tabs button.selected::after {
    scale: 1 1;
  }

  .count {
    min-width: 20px;
    padding: 1px 6px 0;
    border-radius: 10px;
    background: var(--orange);
    color: #fff;
    font-size: 11px;
    text-align: center;
  }

  .view {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  @media (max-width: 640px) {
    .board {
      padding: 20px 16px 24px;
    }

    .tabs {
      overflow-x: auto;
    }
  }
</style>
