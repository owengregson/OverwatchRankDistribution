<!--
  Pick a rank: a row of tier icons and a row of divisions.
  Controlled: the parent passes the selected `tier` and division `number`
  and decides what to do when `onpick(tier, number)` fires.

  The tiers offered are those of the season on screen, unless the parent
  passes `tiers` from another season's ladder.
-->
<script>
  import RankBadge from '@/components/RankBadge.svelte';
  import { ladder } from '@/lib/state/app.svelte.js';

  let { tier, number, onpick, iconSize = 30, tiers = null } = $props();
</script>

<div class="rank-picker" style:--color={tier.color}>
  <div class="tiers" role="group" aria-label="Tier">
    {#each tiers ?? ladder.tiers as option (option.id)}
      <button
        type="button"
        class="tier"
        class:selected={option.id === tier.id}
        style:--option={option.color}
        aria-label={option.name}
        aria-pressed={option.id === tier.id}
        title={option.name}
        onclick={() => onpick(option, number)}
      >
        <RankBadge tier={option} size={iconSize} align="center" animated={false} effects={false} />
      </button>
    {/each}
  </div>

  <div class="divisions" role="group" aria-label="Division">
    {#each tier.divisions as division (division.number)}
      <button
        type="button"
        class="display division"
        class:selected={division.number === number}
        aria-pressed={division.number === number}
        aria-label="Division {division.number}"
        onclick={() => onpick(tier, division.number)}
      >
        {division.number}
      </button>
    {/each}
  </div>
</div>

<style>
  .rank-picker {
    display: grid;
    gap: 8px;
  }

  .tiers {
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    gap: 3px;
  }

  .tier {
    display: grid;
    place-items: center;
    padding: 5px 0;
    border: 1px solid transparent;
    background: rgb(5 10 26 / 0.45);
    opacity: 0.6;
    transition:
      opacity 200ms,
      border-color 200ms,
      background 200ms,
      transform 240ms var(--ease-back);
  }

  .tier:hover {
    opacity: 1;
    transform: translateY(-2px);
  }

  .tier.selected {
    opacity: 1;
    border-color: var(--option);
    background: color-mix(in srgb, var(--option) 16%, transparent);
  }

  .divisions {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 3px;
  }

  .division {
    padding: 5px 0 3px;
    border: 1px solid var(--line);
    background: rgb(5 10 26 / 0.45);
    font-size: 22px;
    color: var(--ice-300);
    transition:
      color 200ms,
      background 200ms,
      border-color 200ms;
  }

  .division:hover {
    color: var(--ice-50);
    border-color: var(--line-strong);
  }

  .division.selected {
    background: var(--color);
    border-color: var(--color);
    color: var(--navy-950);
  }
</style>
