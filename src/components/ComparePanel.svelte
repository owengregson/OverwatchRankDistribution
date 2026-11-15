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

  /** "+7 divs", "−1 div", "same div": how far the cursor's rank is from the pin, signed like the SR gap. */
  const sign = $derived(direction < 0 ? '−' : direction > 0 ? '+' : '');
  const ladderGap = $derived.by(() => {
    const count = comparison?.divisionGap ?? 0;
    return count === 0 ? 'Same div' : `${sign}${count} div${count === 1 ? '' : 's'}`;
  });
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
      <div class="side">
        <RankBadge tier={pinned.tier} division={pinned.division.number} size={44} />
        <div>
          <div class="display rank">{pinned.division.name}</div>
          <div class="numeric meta">{formatSr(pinned.sr)} SR · pinned</div>
        </div>
      </div>

      <div class="arrow" class:down={direction < 0} class:flat={direction === 0} aria-hidden="true">
        <span></span><span></span><span></span>
      </div>

      <dl class="gap">
        <div>
          <dt class="eyebrow">{ladderGap}</dt>
          <dd class="display numeric">
            {sign}{formatSr(comparison.srGap)} <small>SR</small>
          </dd>
        </div>
        <div>
          <dt class="eyebrow">Between</dt>
          <dd class="display numeric">{formatPercent(comparison.playersBetween)}</dd>
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

  /* One row: the pinned rank, chevrons pointing at the cursor's rank, then the gap. */
  .body {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 10px;
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

  /* Chevrons pulse in sequence; they flip to point left when the cursor is below the pin. */
  .arrow {
    display: flex;
    gap: 1px;
    transition: scale 300ms var(--ease-back);
  }

  .arrow.down {
    scale: -1 1;
  }

  .arrow span {
    width: 6px;
    height: 6px;
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

  /* Takes the rest of the row, or drops to a row of its own when the panel is narrow. */
  .gap {
    display: flex;
    flex: 1 1 auto;
    justify-content: space-between;
    gap: 10px;
    margin: 0;
  }

  .gap dt {
    font-size: 9px;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }

  .gap small {
    font-family: var(--font-body);
    font-weight: var(--font-body-weight);
    font-size: 10px;
    letter-spacing: 0.08em;
    color: var(--ice-400);
  }

  .gap dd {
    margin: 1px 0 0;
    font-size: 21px;
    color: var(--ice-50);
    white-space: nowrap;
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
