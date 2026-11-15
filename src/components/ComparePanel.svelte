<!-- Pin a point, then read the gap between it and the cursor. -->
<script>
  import RankBadge from '@/components/RankBadge.svelte';
  import { formatPercent, formatSr } from '@/lib/format.js';
  import { slide } from '@/lib/motion.js';
  import { app } from '@/lib/state/app.svelte.js';

  const probe = app.probe;
  const pinned = $derived(app.pinnedReading);
  const reading = $derived(app.reading);
  const comparison = $derived(app.comparison);
  /** +1 when the cursor is above the pin, -1 below, 0 on it. */
  const direction = $derived(pinned ? Math.sign(reading.sr - pinned.sr) : 0);

  const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
</script>

<section class="panel compare" class:pinned>
  <header>
    <h2 class="display title">Compare</h2>
    {#if pinned}
      <button type="button" class="action" onclick={() => probe.unpin()}>Clear pin</button>
    {:else}
      <button type="button" class="action primary" onclick={() => probe.pin()}>Pin this rank</button>
    {/if}
  </header>

  {#if comparison}
    <div class="body" in:slide>
      <div class="pair">
        <div class="side">
          <RankBadge tier={pinned.tier} division={pinned.division.number} size={40} />
          <div>
            <div class="display rank">{pinned.division.name}</div>
            <div class="numeric meta">{formatSr(pinned.sr)} SR · pinned</div>
          </div>
        </div>

        <div class="arrow" class:down={direction < 0} class:flat={direction === 0} aria-hidden="true">
          <span></span><span></span><span></span>
        </div>

        <div class="side">
          <RankBadge tier={reading.tier} division={reading.division.number} size={40} />
          <div>
            <div class="display rank">{reading.division.name}</div>
            <div class="numeric meta">{formatSr(reading.sr)} SR</div>
          </div>
        </div>
      </div>

      <dl class="gap">
        <div>
          <dt class="eyebrow">SR gap</dt>
          <dd class="display numeric">{direction < 0 ? '−' : direction > 0 ? '+' : ''}{formatSr(comparison.srGap)}</dd>
        </div>
        <div>
          <dt class="eyebrow">Players between</dt>
          <dd class="display numeric">{formatPercent(comparison.playersBetween)}</dd>
        </div>
        <div>
          <dt class="eyebrow">Ladder gap</dt>
          <dd class="display numeric">{plural(comparison.divisionGap, 'div')}</dd>
        </div>
      </dl>
    </div>
  {:else}
    <p class="hint" in:slide>
      Click the curve to pin a rank, then move to measure the SR and player gap to any other rank.
    </p>
  {/if}
</section>

<style>
  .compare {
    display: grid;
    gap: 9px;
    padding: 13px 20px 14px;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .title {
    font-size: 26px;
    font-style: italic;
  }

  .action {
    padding: 4px 10px;
    border: 1px solid var(--line-strong);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ice-200);
    transition:
      background 180ms,
      color 180ms,
      border-color 180ms;
  }

  .action:hover {
    background: var(--ice-100);
    border-color: var(--ice-100);
    color: var(--navy-900);
  }

  .action.primary {
    border-color: var(--orange);
    color: var(--orange-hot);
  }

  .action.primary:hover {
    background: var(--orange);
    color: #fff;
  }

  .hint {
    font-size: 12px;
    color: var(--ice-400);
    text-wrap: pretty;
  }

  .body {
    display: grid;
    gap: 12px;
  }

  .pair {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 8px;
  }

  .side {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  .rank {
    font-size: 20px;
    white-space: nowrap;
  }

  .meta {
    font-size: 10px;
    color: var(--ice-400);
    white-space: nowrap;
  }

  /* Three chevrons that pulse in sequence towards the cursor's rank. */
  .arrow {
    display: flex;
    gap: 2px;
    transition: rotate 300ms var(--ease-back);
  }

  .arrow span {
    width: 7px;
    height: 7px;
    border-top: 2px solid var(--orange-hot);
    border-right: 2px solid var(--orange-hot);
    rotate: 45deg;
    animation: chevron 1.2s ease-in-out infinite;
  }

  .arrow span:nth-child(2) {
    animation-delay: 150ms;
  }

  .arrow span:nth-child(3) {
    animation-delay: 300ms;
  }

  .arrow.flat span {
    animation: none;
    opacity: 0.35;
  }

  .gap {
    display: grid;
    grid-template-columns: repeat(3, auto);
    justify-content: space-between;
    gap: 10px;
    margin: 0;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }

  .gap dt {
    font-size: 10px;
  }

  .gap dd {
    margin: 2px 0 0;
    font-size: 25px;
    color: var(--ice-50);
  }

  @keyframes chevron {
    0%,
    100% {
      opacity: 0.25;
    }
    40% {
      opacity: 1;
    }
  }
</style>
