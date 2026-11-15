<!--
  One editable datapoint: where it sits (a rank or an exact SR), the
  percentage, its weight and a note. With no `point` it is the "add" row.
-->
<script>
  import ConfirmButton from '@/components/ConfirmButton.svelte';
  import { parseWhere, runAdminAction, srOf } from '@/lib/admin.js';
  import { backend } from '@/lib/backend/index.js';
  import { toasts } from '@/lib/state/toasts.svelte.js';

  /** `ladder` is the ladder of the season these datapoints belong to. */
  let { seasonId, ladder, point = null, model = null } = $props();

  const blank = () => ({
    where: point ? (point.rank ?? String(point.sr)) : '',
    betterThan: point?.betterThan ?? null,
    weight: point?.weight ?? 1,
    note: point?.note ?? '',
  });

  let draft = $state(blank());
  let busy = $state(false);

  // When the stored point changes (after a save or refresh), start again from it.
  $effect(() => {
    point;
    draft = blank();
  });

  const original = $derived(blank());
  const dirty = $derived(JSON.stringify(draft) !== JSON.stringify(original));
  /** What the current curve says at this datapoint's SR, as a percentage. */
  const curve = $derived.by(() => {
    const sr = point ? srOf(point, ladder) : null;
    return model && sr !== null ? model.cdf(sr) * 100 : null;
  });

  function read() {
    const where = parseWhere(draft.where, ladder);
    if (!(draft.betterThan > 0 && draft.betterThan < 100)) throw new Error('"Better than" must be between 0 and 100.');
    if (!(draft.weight > 0)) throw new Error('Weight must be more than 0.');
    return { id: point?.id, ...where, betterThan: draft.betterThan, weight: draft.weight, note: draft.note.trim() };
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
    if (ok && !point) draft = blank();
  }

  async function remove() {
    busy = true;
    await runAdminAction(() => backend.deleteDatapoint(point.id), 'Datapoint deleted.');
    busy = false;
  }
</script>

<form class="row" class:adding={!point} class:busy onsubmit={save}>
  <input class="input compact" aria-label="Rank or SR" placeholder="Master 3 or 3700" required bind:value={draft.where} />
  <span class="percent">
    <input
      class="input compact"
      type="number"
      aria-label="Better than (percent)"
      min="0"
      max="100"
      step="any"
      placeholder="97"
      required
      bind:value={draft.betterThan}
    />
    %
  </span>
  <input class="input compact" type="number" aria-label="Weight" min="0" step="any" required bind:value={draft.weight} />
  <input class="input compact" aria-label="Note" placeholder="Where it came from" maxlength="300" bind:value={draft.note} />
  <span class="numeric curve">{curve === null ? '—' : `${curve.toFixed(2)}%`}</span>
  <span class="actions">
    {#if point}
      <button type="submit" class="btn small" class:primary={dirty} disabled={!dirty || busy}>Save</button>
      <ConfirmButton disabled={busy} onconfirm={remove} />
    {:else}
      <button type="submit" class="btn small primary" disabled={busy}>Add datapoint</button>
    {/if}
  </span>
</form>

<style>
  /* Columns are shared with the header row in DatapointManager via --columns. */
  .row {
    display: grid;
    grid-template-columns: var(--columns);
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-top: 1px solid var(--line);
    transition: opacity 200ms;
  }

  .row.busy {
    opacity: 0.5;
  }

  .row.adding {
    margin-top: 6px;
    padding-top: 14px;
    border-top: 1px dashed var(--line-strong);
  }

  .percent {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--ice-400);
  }

  .curve {
    color: var(--ice-300);
    text-align: right;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  @media (max-width: 860px) {
    .row {
      grid-template-columns: 1fr 1fr;
    }

    .curve {
      text-align: left;
    }
  }
</style>
