<!-- The full reading for the point under the cursor. -->
<script>
  import RankBadge from '@/components/RankBadge.svelte';
  import { formatOneIn, formatPercent, formatSr } from '@/lib/format.js';
  import { app, ladder } from '@/lib/state/app.svelte.js';

  const reading = $derived(app.reading);
  const stats = $derived([
    { label: 'Top', value: formatPercent(reading.top) },
    { label: 'This rank or higher', value: formatOneIn(reading.top) ?? 'Most players' },
    { label: `In ${reading.division.name}`, value: formatPercent(reading.divisionShare) },
    { label: `In ${reading.tier.name}`, value: formatPercent(reading.tierShare) },
  ]);
</script>

<section class="panel readout">
  <div class="bar"></div>

  <header>
    <span class="eyebrow">Selected rank</span>
    <span class="eyebrow numeric">{ladder.rangeLabel(reading.division)} SR</span>
  </header>

  <div class="hero">
    <RankBadge tier={reading.tier} division={reading.division.number} size="var(--badge-size)" />
    <div class="identity">
      <h2 class="display name">{reading.tier.name}<span class="division">{reading.division.number}</span></h2>
      <p class="sr numeric"><b class="display">{formatSr(reading.sr)}</b> SR</p>
    </div>
  </div>

  <div class="percentile">
    <span class="eyebrow lead">Better than</span>
    <div class="display figure numeric">{formatPercent(reading.betterThan)}</div>
    <span class="eyebrow">of players</span>
    <div class="meter" aria-hidden="true">
      <div class="fill" style:scale="{reading.betterThan} 1"></div>
      <div class="head" style:left="{reading.betterThan * 100}%"></div>
    </div>
  </div>

  <dl class="stats">
    {#each stats as stat}
      <div>
        <dt class="eyebrow">{stat.label}</dt>
        <dd class="display numeric">{stat.value}</dd>
      </div>
    {/each}
  </dl>

  <div class="next">
    <div class="track" aria-hidden="true">
      <div class="progress" style:scale="{reading.progress} 1"></div>
    </div>
    <p class="numeric">
      {#if reading.next}
        <b>{formatSr(reading.srToNext)} SR</b> to {reading.next.name}
      {:else}
        Top division of the ladder
      {/if}
    </p>
  </div>
</section>

<style>
  .readout {
    --badge-size: 108px;
    display: grid;
    gap: 10px;
    padding: 15px 20px 12px;
  }

  /* Accent line in the tier's colour along the top edge. */
  .bar {
    position: absolute;
    inset: 0 0 auto var(--chamfer);
    height: 3px;
    background: linear-gradient(90deg, var(--tier), transparent 85%);
    transition: --tier 400ms;
  }

  header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .hero {
    position: relative;
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .identity {
    min-width: 0;
  }

  .name {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    column-gap: 10px;
    font-size: clamp(36px, 3.2vw, 46px);
    font-style: italic;
    color: var(--tier);
    text-shadow: 0 0 28px color-mix(in srgb, var(--tier) 45%, transparent);
  }

  .division {
    color: var(--ice-50);
  }

  .sr {
    margin-top: 4px;
    color: var(--ice-400);
    font-size: 13px;
    letter-spacing: 0.08em;
  }

  .sr b {
    margin-right: 4px;
    font-size: 30px;
    color: var(--ice-50);
  }

  .percentile {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: baseline;
    gap: 2px 10px;
    padding: 9px 14px 12px;
    background: rgb(5 10 26 / 0.45);
    border-left: 3px solid var(--tier);
  }

  .lead {
    grid-column: 1 / -1;
  }

  .figure {
    font-size: 46px;
    color: var(--ice-50);
  }

  .meter {
    position: relative;
    grid-column: 1 / -1;
    height: 6px;
    margin-top: 6px;
    background: rgb(160 185 255 / 0.14);
  }

  .fill {
    position: absolute;
    inset: 0;
    transform-origin: left;
    background: linear-gradient(90deg, color-mix(in srgb, var(--tier) 35%, transparent), var(--tier));
  }

  .head {
    position: absolute;
    top: 50%;
    width: 10px;
    height: 10px;
    translate: -50% -50%;
    rotate: 45deg;
    background: var(--ice-50);
    box-shadow: 0 0 12px var(--tier);
  }

  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    margin: 0;
    background: var(--line);
    border: 1px solid var(--line);
  }

  .stats div {
    padding: 7px 12px 6px;
    background: rgb(13 21 52 / 0.92);
  }

  .stats dt {
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stats dd {
    margin: 2px 0 0;
    font-size: 24px;
    color: var(--ice-50);
  }

  .next {
    display: grid;
    gap: 7px;
  }

  .track {
    height: 4px;
    background: rgb(160 185 255 / 0.14);
    /* Notches at each fifth, echoing the five divisions. */
    mask: repeating-linear-gradient(90deg, #000 0 calc(20% - 2px), transparent calc(20% - 2px) 20%);
  }

  .progress {
    height: 100%;
    transform-origin: left;
    background: var(--tier);
  }

  .next p {
    font-size: 12px;
    color: var(--ice-400);
  }

  .next b {
    color: var(--ice-100);
  }

  /* Short screens: shrink the badge and drop the least essential row. */
  @media (max-height: 800px) {
    .readout {
      --badge-size: 84px;
      gap: 9px;
    }

    .figure {
      font-size: 38px;
    }

    .next {
      display: none;
    }
  }
</style>
