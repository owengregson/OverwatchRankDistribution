<!--
  One datapoint in the admin panel's grid. With no `point` it is the tile
  that adds one.

  Closed, which is how it starts, it is just the rank's badge: the tier
  icon over its division plate. Opened, it takes the full width of the grid
  and shows everything about the datapoint to edit.

  Where a datapoint sits is set with three controls, never typed:

    Rank       the tier, from a dropdown
    Division   5 to 1, on a slider
    Percent    how far through that division, 0 to 99 (the game's "rank
               progress"), on a slider

  At 0% the datapoint is stored as the rank ("Master 3"), and above that as
  the exact SR the three add up to.
-->
<script>
  import ConfirmButton from '@/components/ConfirmButton.svelte';
  import RankBadge from '@/components/RankBadge.svelte';
  import Select from '@/components/Select.svelte';
  import Slider from '@/components/Slider.svelte';
  import { runAdminAction, srOf } from '@/lib/admin.js';
  import { backend } from '@/lib/backend/index.js';
  import { formatSr } from '@/lib/format.js';
  import { MAX_PROGRESS, progressAt, srAt } from '@/lib/ladder/progress.js';
  import { slide } from '@/lib/motion.js';
  import { toasts } from '@/lib/state/toasts.svelte.js';

  /** `ladder` is the ladder of the season these datapoints belong to. */
  let { seasonId, ladder, point = null, model = null } = $props();

  /** Where the stored datapoint sits, as the three controls show it; null if its rank is not on this ladder. */
  function placeOf(stored) {
    const sr = stored ? srOf(stored, ladder) : null;
    if (sr === null) return null;
    const division = ladder.divisionAt(sr);
    return { tierId: division.tier.id, number: division.number, progress: progressAt(division, sr) };
  }

  /** Where a new datapoint starts: the bottom of the middle tier. */
  const middle = () => ({
    tierId: ladder.tiers[Math.floor(ladder.tiers.length / 2)].id,
    number: ladder.divisionsPerTier,
    progress: 0,
  });

  const blank = () => ({
    ...(placeOf(point) ?? middle()),
    betterThan: point?.betterThan ?? null,
    weight: point?.weight ?? 1,
    note: point?.note ?? '',
  });

  let draft = $state(blank());
  let open = $state(false);
  let busy = $state(false);

  // When the stored point changes (after a save or refresh), start again from it.
  $effect(() => {
    point;
    draft = blank();
  });

  const original = $derived(blank());
  const dirty = $derived(JSON.stringify(draft) !== JSON.stringify(original));
  /** The datapoint has been moved: its rank, division or percent is not what is stored. */
  const moved = $derived(
    draft.tierId !== original.tierId || draft.number !== original.number || draft.progress !== original.progress,
  );
  /** The stored rank is one this season's ladder does not have, so it could not be placed. */
  const unplaced = $derived(Boolean(point) && placeOf(point) === null);

  const tier = $derived(ladder.tiers.find((option) => option.id === draft.tierId) ?? ladder.tiers[0]);
  const division = $derived(tier.divisions.find((option) => option.number === draft.number) ?? tier.divisions[0]);
  /** The SR the three controls add up to. */
  const sr = $derived(point && !moved ? (srOf(point, ladder) ?? division.minSr) : srAt(division, draft.progress));
  /** What the current curve says at the stored datapoint's SR, as a percentage. */
  const curve = $derived.by(() => {
    const stored = point ? srOf(point, ladder) : null;
    return model && stored !== null ? model.cdf(stored) * 100 : null;
  });

  /** Division numbers run 5 to 1 from left to right, so the slider counts the other way. */
  const flip = (value) => ladder.divisionsPerTier + 1 - value;

  /** The closed tile's tooltip: what opening it would show. */
  const summary = $derived(
    [
      unplaced ? `${point.rank} (not on this ladder)` : division.name,
      draft.progress ? `${draft.progress}% through` : null,
      `${formatSr(sr)} SR`,
      draft.betterThan === null ? null : `better than ${draft.betterThan}%`,
      curve === null ? null : `curve says ${curve.toFixed(2)}%`,
    ]
      .filter(Boolean)
      .join(' · '),
  );

  /** The line under the open tile's title: its SR, and what the curve makes of it. */
  const details = $derived(
    [
      point ? null : division.name,
      `${formatSr(sr)} SR`,
      curve === null ? null : `curve says ${curve.toFixed(2)}%`,
    ]
      .filter(Boolean)
      .join(' · '),
  );

  /** Where the datapoint is to be stored: its rank at 0%, an exact SR above that. */
  function where() {
    // Left where it was, it keeps exactly what is stored: an SR between two whole percents is not rounded to one.
    if (point && !moved) return point.rank ? { rank: point.rank } : { sr: point.sr };
    return draft.progress > 0 ? { sr: srAt(division, draft.progress) } : { rank: division.name };
  }

  function read() {
    if (!(draft.betterThan > 0 && draft.betterThan < 100)) throw new Error('"Better than" must be between 0 and 100.');
    if (!(draft.weight > 0)) throw new Error('Weight must be more than 0.');
    return { id: point?.id, ...where(), betterThan: draft.betterThan, weight: draft.weight, note: draft.note.trim() };
  }

  async function save(event) {
    event.preventDefault();
    let datapoint;
    try {
      datapoint = read();
    } catch (error) {
      toasts.error(error.message);
      return;
    }
    busy = true;
    const ok = await runAdminAction(
      () => backend.saveDatapoint(seasonId, datapoint),
      point ? 'Datapoint updated.' : 'Datapoint added.',
    );
    busy = false;
    // The adding tile stays open on the same rank, ready for the next one.
    if (ok && !point) draft = { ...draft, progress: 0, betterThan: null, note: '' };
  }

  async function remove() {
    busy = true;
    await runAdminAction(() => backend.deleteDatapoint(point.id), 'Datapoint deleted.');
    busy = false;
  }
</script>

{#if !open}
  <button
    type="button"
    class="tile"
    class:adding={!point}
    class:dirty
    style:--tier={tier.color}
    aria-expanded="false"
    aria-label={point ? `Edit datapoint: ${summary}` : 'Add a datapoint'}
    title={point ? summary : 'Add a datapoint'}
    onclick={() => (open = true)}
  >
    {#if point}
      <RankBadge {tier} division={division.number} size={40} animated={false} effects={false} />
    {:else}
      <span class="plus" aria-hidden="true"></span>
    {/if}
  </button>
{:else}
  <form class="editor" class:busy style:--tier={tier.color} onsubmit={save} in:slide>
    <div class="top">
      <RankBadge {tier} division={division.number} size={46} effects={false} />
      <div class="what">
        <strong class="display">{point ? division.name : 'New datapoint'}</strong>
        <span class="numeric">{details}</span>
      </div>
      {#if unplaced}
        <span class="chip warn">"{point.rank}" is not on this season's ladder</span>
      {/if}
      <span class="actions">
        {#if point}
          <button type="submit" class="btn small" class:primary={dirty} disabled={!dirty || busy}>Save</button>
          <ConfirmButton disabled={busy} onconfirm={remove} />
        {:else}
          <button type="submit" class="btn small primary" disabled={busy}>Add datapoint</button>
        {/if}
        <button type="button" class="btn small ghost" aria-expanded="true" onclick={() => (open = false)}>Close</button>
      </span>
    </div>

    <div class="controls">
      <div class="field">
        <span class="label">Rank</span>
        <Select
          compact
          label="Rank"
          bind:value={draft.tierId}
          options={ladder.tiers.map((option) => ({ value: option.id, label: option.name }))}
        />
      </div>
      <div class="field">
        <span class="label">Division</span>
        <Slider
          compact
          label="Division"
          unit=""
          min={1}
          max={ladder.divisionsPerTier}
          format={flip}
          bind:value={() => flip(draft.number), (value) => (draft.number = flip(value))}
        />
      </div>
      <div class="field" title="How far through the division: the game's rank progress. 0% is the start of the rank.">
        <span class="label">Percent</span>
        <Slider compact label="Percent through the division" max={MAX_PROGRESS} bind:value={draft.progress} />
      </div>
      <label class="field">
        <span class="label">Better than</span>
        <span class="percent">
          <input
            class="input compact"
            type="number"
            aria-label="Better than (percent of players)"
            min="0"
            max="100"
            step="any"
            placeholder="97"
            required
            bind:value={draft.betterThan}
          />
          %
        </span>
      </label>
      <label class="field">
        <span class="label">Weight</span>
        <input class="input compact" type="number" min="0" step="any" required bind:value={draft.weight} />
      </label>
      <label class="field">
        <span class="label">Note</span>
        <input class="input compact" placeholder="Where it came from" maxlength="300" bind:value={draft.note} />
      </label>
    </div>
  </form>
{/if}

<style>
  /* Closed: a small square holding the badge. The grid it sits in is DatapointManager's. */
  .tile {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 62px;
    padding: 6px 4px 5px;
    border: 1px solid transparent;
    background: rgb(5 10 26 / 0.45);
    transition:
      border-color 200ms,
      background 200ms,
      transform 240ms var(--ease-back);
  }

  .tile:hover,
  .tile:focus-visible {
    border-color: var(--tier);
    background: color-mix(in srgb, var(--tier) 14%, rgb(5 10 26 / 0.45));
    transform: translateY(-2px);
  }

  /* Edits that have not been saved, on a tile that was closed again. */
  .tile.dirty::after {
    content: '';
    position: absolute;
    top: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
  }

  .tile.adding {
    border: 1px dashed var(--line-strong);
    background: none;
  }

  .tile.adding:hover,
  .tile.adding:focus-visible {
    border-color: var(--orange);
    background: rgb(240 100 20 / 0.1);
  }

  .plus {
    position: relative;
    width: 16px;
    height: 16px;
  }

  .plus::before,
  .plus::after {
    content: '';
    position: absolute;
    inset: 7px 0;
    background: var(--orange);
  }

  .plus::after {
    rotate: 90deg;
  }

  /* Open: a full row of the grid. */
  .editor {
    grid-column: 1 / -1;
    display: grid;
    gap: 10px;
    padding: 10px 14px 12px;
    border: 1px solid var(--line-strong);
    border-left: 3px solid var(--tier);
    background: rgb(5 10 26 / 0.4);
    transition:
      opacity 200ms,
      border-color 300ms;
  }

  .editor.busy {
    opacity: 0.5;
  }

  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
  }

  .what {
    display: grid;
    gap: 1px;
  }

  .what strong {
    font-size: 24px;
    line-height: 1;
    color: var(--tier);
    transition: color 300ms;
  }

  .what span {
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--ice-400);
  }

  .actions {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }

  .controls {
    display: grid;
    grid-template-columns: 140px minmax(130px, 1fr) minmax(170px, 1.5fr) 96px 72px minmax(140px, 1.5fr);
    align-items: end;
    gap: 8px 16px;
  }

  .field {
    gap: 4px;
    min-width: 0;
  }

  .field > .label {
    font-size: 10px;
  }

  .percent {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--ice-400);
  }

  @media (max-width: 860px) {
    .controls {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
