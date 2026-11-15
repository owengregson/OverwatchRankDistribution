<!-- Light floating nav bar: brand tile, season tabs, model summary and call to action. -->
<script>
  import ModelPopover from '@/components/ModelPopover.svelte';
  import { app } from '@/lib/state/app.svelte.js';
  import { focusFinder } from '@/lib/ui.js';
</script>

<header class="nav">
  <div class="brand">
    <!-- Site mark: a bell curve in a ring. -->
    <svg class="mark" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="16.5" fill="none" stroke="currentColor" stroke-width="4" />
      <path d="M4 12a17.5 17.5 0 0 1 32 0" fill="none" stroke="var(--orange)" stroke-width="4.4" />
      <path d="M9 27c5 0 6-12 11-12s6 12 11 12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" />
    </svg>
    <span class="display wordmark">Rank Distribution</span>
  </div>

  <nav class="seasons" aria-label="Season">
    {#each app.seasons as season (season.id)}
      <button
        type="button"
        class:current={season.id === app.seasonId}
        aria-current={season.id === app.seasonId ? 'true' : undefined}
        onclick={() => app.selectSeason(season.id)}
      >
        {season.name}
      </button>
    {/each}
  </nav>

  <div class="spacer"></div>

  {#if app.model}
    <ModelPopover />
  {/if}

  <button type="button" class="cta" onclick={focusFinder}>Find my rank</button>
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
    animation: drop-in 700ms var(--ease-out) backwards;
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
  }

  .mark {
    width: 34px;
    height: 34px;
    color: var(--navy-700);
    transition: rotate 700ms var(--ease-back);
  }

  .brand:hover .mark {
    rotate: 360deg;
  }

  .wordmark {
    padding-top: 3px;
    font-size: 27px;
    font-style: italic;
    white-space: nowrap;
  }

  .seasons {
    display: flex;
    height: 100%;
    margin-left: 8px;
  }

  .seasons button {
    position: relative;
    padding: 0 14px;
    font-size: 15px;
    color: var(--ice-500);
    white-space: nowrap;
    transition: color 180ms;
  }

  .seasons button::after {
    content: '';
    position: absolute;
    inset: auto 14px 9px;
    height: 3px;
    background: var(--orange);
    scale: 0 1;
    transition: scale 300ms var(--ease-out);
  }

  .seasons button:hover,
  .seasons button.current {
    color: var(--navy-800);
  }

  .seasons button.current::after {
    scale: 1 1;
  }

  .spacer {
    flex: 1;
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

    .seasons button {
      padding: 0 8px;
      font-size: 13px;
    }

    .nav :global(.chip) {
      display: none;
    }

    .cta {
      padding: 0 14px;
    }
  }
</style>
