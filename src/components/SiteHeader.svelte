<!--
  Light floating nav bar: brand tile, seasons, page links and call to action.

  Seasons: each current one has a tab, and the older ones share an "Older
  Seasons" menu ahead of the tabs. Which a season is, is its `older` field,
  set in the admin panel's Seasons tab.
-->
<script>
  import Select from '@/components/Select.svelte';
  import { imageUrl } from '@/lib/assets.js';
  import { backend } from '@/lib/backend/index.js';
  import { href, router } from '@/lib/router.svelte.js';
  import { app } from '@/lib/state/app.svelte.js';
  import { focusFinder } from '@/lib/ui.js';

  const onHome = $derived(router.path === '');
  /** The season on the chart is one of those in the "Older Seasons" menu. */
  const viewingOlder = $derived(onHome && app.olderSeasons.some((season) => season.id === app.seasonId));

  /** The finder lives on the home page: go there first if needed. */
  async function findMyRank() {
    if (!onHome) {
      router.go('');
      // Wait for the home page to be on screen before focusing its input.
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    focusFinder();
  }

  function selectSeason(id) {
    app.selectSeason(id);
    if (!onHome) router.go('');
  }

  // When there are more season tabs than fit, the strip scrolls sideways
  // inside the bar. Keep the season on screen's tab in view: on arrival
  // (the newest season is the last tab) and whenever the season changes.
  let seasonTabs = $state();
  $effect(() => {
    app.seasonId;
    app.viewableSeasons;
    const tab = seasonTabs?.querySelector('[aria-current]');
    if (!tab) return;
    const strip = seasonTabs.getBoundingClientRect();
    const box = tab.getBoundingClientRect();
    if (box.left < strip.left) seasonTabs.scrollLeft -= strip.left - box.left;
    else if (box.right > strip.right) seasonTabs.scrollLeft += box.right - strip.right;
  });
</script>

<header class="nav">
  <a class="brand" href={href('')} aria-label="Overwatch Rank Distribution home">
    <!-- The dark-fill logo, for the white tile it sits on. -->
    <img
      class="mark"
      src={imageUrl('overwatch_logo_dark_fill.svg')}
      alt="Overwatch"
      width="36"
      height="36"
      draggable="false"
    />
    <span class="display wordmark">Rank Distribution</span>
  </a>

  <nav class="seasons" aria-label="Season" bind:this={seasonTabs}>
    <!-- The seasons an admin has put away share one menu, ahead of the tabs. -->
    {#if app.olderSeasons.length}
      <span class="older" class:current={viewingOlder}>
        <Select
          bare
          caption="Older Seasons"
          label="Older seasons"
          value={onHome ? app.seasonId : null}
          options={app.olderSeasons.map((season) => ({ value: season.id, label: season.name }))}
          onchange={selectSeason}
        />
      </span>
    {/if}

    {#each app.tabSeasons as season (season.id)}
      <button
        type="button"
        class:current={onHome && season.id === app.seasonId}
        aria-current={season.id === app.seasonId ? 'true' : undefined}
        onclick={() => selectSeason(season.id)}
      >
        {season.name}
      </button>
    {/each}
  </nav>

  <div class="spacer"></div>

  {#if backend.canSubmit}
    <a class="link" class:current={router.path === 'submit'} href={href('submit')}>
      <span class="plus" aria-hidden="true"></span>
      <span class="long">Submit a datapoint</span>
      <span class="short">Submit</span>
    </a>
  {/if}

  <button type="button" class="cta" onclick={findMyRank}>Find my rank</button>
</header>

<style>
  .nav {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 58px;
    margin: 14px var(--gutter) 0;
    padding-right: 9px;
    border-radius: 6px;
    background: linear-gradient(180deg, #f8fafd, #dde5f2);
    color: var(--navy-800);
    box-shadow:
      0 14px 34px rgb(0 0 0 / 0.38),
      inset 0 -2px 0 rgb(16 27 64 / 0.1);
    animation: drop-in 480ms var(--ease-out) backwards;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    height: 100%;
    padding: 0 20px 0 16px;
    border-radius: 6px 0 0 6px;
    background: #fff;
    box-shadow: 1px 0 0 rgb(16 27 64 / 0.1);
    color: inherit;
    text-decoration: none;
  }

  .mark {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }

  .wordmark {
    padding-top: 3px;
    font-size: 27px;
    font-style: italic;
    white-space: nowrap;
  }

  /*
   * The season tabs give way when the bar is too narrow for everything:
   * the strip shrinks and scrolls sideways (no scrollbar; swipe, or it
   * follows the selected season), so the links and button after it always
   * stay in the bar.
   */
  .seasons {
    display: flex;
    flex: 0 1 auto;
    min-width: 0;
    height: 100%;
    margin-left: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }

  .seasons::-webkit-scrollbar {
    display: none;
  }

  /* The menu's button is drawn by Select; here it is dressed as one more tab. */
  .older {
    position: relative;
    display: flex;
    flex: none;
  }

  .seasons button,
  .older :global(.trigger) {
    position: relative;
    flex: none;
    padding: 0 14px;
    font-size: 15px;
    color: var(--ice-500);
    white-space: nowrap;
    transition: color 180ms;
  }

  .older :global(.trigger) {
    gap: 7px;
  }

  .seasons button::after,
  .older::after {
    content: '';
    position: absolute;
    inset: auto 14px 9px;
    height: 3px;
    background: var(--orange);
    scale: 0 1;
    transition: scale 300ms var(--ease-out);
    pointer-events: none;
  }

  .seasons button:hover,
  .seasons button.current,
  .older :global(.trigger:hover),
  .older :global(.trigger.open),
  .older.current :global(.trigger) {
    color: var(--navy-800);
  }

  .seasons button.current::after,
  .older.current::after {
    scale: 1 1;
  }

  .spacer {
    flex: 1;
  }

  .link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 9px;
    height: 100%;
    padding: 0 16px;
    font-size: 15px;
    color: var(--ice-500);
    text-decoration: none;
    white-space: nowrap;
    transition: color 180ms;
  }

  .link::after {
    content: '';
    position: absolute;
    inset: auto 16px 9px;
    height: 3px;
    background: var(--orange);
    scale: 0 1;
    transition: scale 300ms var(--ease-out);
  }

  .link:hover,
  .link.current {
    color: var(--navy-800);
  }

  .link.current::after {
    scale: 1 1;
  }

  /* A plus sign that turns a quarter on hover. */
  .plus {
    position: relative;
    width: 12px;
    height: 12px;
    transition: rotate 320ms var(--ease-back);
  }

  .plus::before,
  .plus::after {
    content: '';
    position: absolute;
    inset: 5px 0;
    background: var(--orange);
  }

  .plus::after {
    rotate: 90deg;
  }

  .link:hover .plus {
    rotate: 90deg;
  }

  .short {
    display: none;
  }

  .cta {
    position: relative;
    overflow: hidden;
    height: 40px;
    padding: 0 22px;
    border-radius: var(--radius);
    background: var(--orange);
    color: #fff;
    font-size: 14px;
    white-space: nowrap;
    box-shadow: 0 4px 14px rgb(240 100 20 / 0.4);
    transition:
      background 180ms,
      transform 200ms var(--ease-back),
      box-shadow 200ms;
  }

  .cta::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 35%, rgb(255 255 255 / 0.5) 50%, transparent 65%);
    translate: -110% 0;
  }

  .cta:hover {
    background: var(--orange-hot);
    transform: translateY(-1px);
    box-shadow: 0 8px 22px rgb(240 100 20 / 0.5);
  }

  .cta:hover::after {
    translate: 110% 0;
    transition: translate 650ms var(--ease-out);
  }

  .cta:active {
    transform: translateY(1px) scale(0.98);
  }

  @keyframes drop-in {
    from {
      opacity: 0;
      translate: 0 -24px;
    }
  }

  @media (max-width: 760px) {
    .wordmark {
      display: none;
    }

    .brand {
      padding-right: 14px;
    }

    .seasons button,
    .older :global(.trigger) {
      padding: 0 8px;
      font-size: 13px;
    }

    .seasons button::after,
    .older::after {
      inset-inline: 8px;
    }

    .cta {
      padding: 0 14px;
    }

    .link {
      padding: 0 8px;
      font-size: 13px;
    }

    .long {
      display: none;
    }

    .short {
      display: inline;
    }
  }
</style>
