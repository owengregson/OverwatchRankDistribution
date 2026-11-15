<!-- Home: the interactive curve with the readout, finder and compare panels. -->
<script>
  import ComparePanel from '@/components/ComparePanel.svelte';
  import DistributionChart from '@/components/DistributionChart.svelte';
  import FinderPanel from '@/components/FinderPanel.svelte';
  import ReadoutPanel from '@/components/ReadoutPanel.svelte';
  import { app } from '@/lib/state/app.svelte.js';
</script>

{#if app.error}
  <main class="failed">
    <section class="panel problem rise">
      <p class="eyebrow">{app.season.name}</p>
      <h1 class="display">This season's data needs attention</h1>
      <p>{app.error.message}</p>
    </section>
  </main>
{:else}
  <main>
    <section class="panel stage rise" style:--i={0} aria-labelledby="page-title">
      <header class="intro">
        <div>
          <p class="eyebrow">Competitive · {app.season.name}</p>
          <h1 id="page-title" class="display">Where do you <em>stand?</em></h1>
        </div>
        <ul class="keys" aria-label="Controls">
          <li class="touch">Drag to explore</li>
          <li class="pointer"><kbd>←</kbd><kbd>→</kbd> Division</li>
          <li class="pointer"><kbd>Shift</kbd> Fine</li>
          <li class="pointer"><kbd>Click</kbd> Pin</li>
          <li class="pointer"><kbd>Esc</kbd> Clear</li>
        </ul>
      </header>

      <DistributionChart />
    </section>

    <aside class="side">
      <div class="rise" style:--i={1}><ReadoutPanel /></div>
      <div class="rise" style:--i={2}><FinderPanel /></div>
      <div class="rise" style:--i={3}><ComparePanel /></div>
    </aside>
  </main>
{/if}

<style>
  main {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(320px, 25vw, 400px);
    gap: var(--gutter);
    min-height: 0;
    padding: var(--gutter) var(--gutter) 0;
  }

  .stage {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 18px 12px 8px;
  }

  .intro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    padding: 0 12px 4px;
  }

  h1 {
    margin-top: 4px;
    font-size: clamp(40px, 4.4vw, 70px);
    font-style: italic;
    white-space: nowrap;
  }

  h1 em {
    font-style: inherit;
    color: var(--tier);
    text-shadow: 0 0 34px color-mix(in srgb, var(--tier) 50%, transparent);
  }

  .keys {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px 16px;
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ice-400);
  }

  .keys li {
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  kbd {
    min-width: 22px;
    padding: 2px 6px 1px;
    border: 1px solid var(--line-strong);
    border-bottom-width: 2px;
    border-radius: 3px;
    background: rgb(5 10 26 / 0.5);
    font: inherit;
    font-size: 10px;
    text-align: center;
    color: var(--ice-200);
  }

  .touch {
    display: none;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: var(--gutter);
    min-width: 0;
  }

  /* Wide screens: the chart takes the height left over; the side panels scroll if they cannot fit. */
  @media (min-width: 1041px) {
    .side {
      overflow-y: auto;
      scrollbar-width: none;
    }
  }

  .failed {
    display: grid;
    place-items: center;
  }

  .problem {
    display: grid;
    gap: 10px;
    max-width: 560px;
    padding: 28px 30px;
  }

  .problem h1 {
    font-size: 44px;
    white-space: normal;
  }

  /* Devices without hover get the touch hint instead of key caps. */
  @media (hover: none) {
    .pointer {
      display: none;
    }

    .touch {
      display: flex;
    }
  }

  /* Stack the panels under the chart on narrow screens. */
  @media (max-width: 1040px) {
    main {
      grid-template-columns: minmax(0, 1fr);
    }

    .stage {
      min-height: min(620px, 78dvh);
    }

    .side {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      align-items: start;
    }
  }

  @media (max-width: 700px) {
    .keys {
      display: none;
    }
  }
</style>
