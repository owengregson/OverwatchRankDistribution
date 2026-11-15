<!-- Add, rename and delete seasons. A season's datapoints are managed on the Datapoints tab. -->
<script>
  import ConfirmButton from '@/components/ConfirmButton.svelte';
  import { runAdminAction } from '@/lib/admin.js';
  import { backend } from '@/lib/backend/index.js';
  import { app } from '@/lib/state/app.svelte.js';
  import { toasts } from '@/lib/state/toasts.svelte.js';

  const thisYear = new Date().getFullYear();

  /** Edits in progress, by season id. */
  let drafts = $state({});
  let adding = $state({ name: '', year: thisYear, number: null });
  let busyId = $state(null);

  const draftFor = (season) => drafts[season.id] ?? { name: season.name, year: season.year, number: season.number };
  const isDirty = (season) => {
    const draft = drafts[season.id];
    return Boolean(draft) && (draft.name !== season.name || draft.year !== season.year || draft.number !== season.number);
  };
  const change = (season, field, value) => (drafts[season.id] = { ...draftFor(season), [field]: value });

  function check({ name, year, number }) {
    if (!String(name).trim()) throw new Error('Give the season a name.');
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Enter a four-digit year.');
    if (!Number.isInteger(number) || number < 1) throw new Error('Season number must be a whole number, 1 or more.');
  }

  async function run(id, action, message) {
    busyId = id;
    const ok = await runAdminAction(action, message);
    busyId = null;
    return ok;
  }

  async function save(season) {
    const draft = draftFor(season);
    try {
      check(draft);
    } catch (error) {
      return toasts.error(error.message);
    }
    const ok = await run(season.id, () => backend.saveSeason({ id: season.id, ...draft, name: draft.name.trim() }, false), 'Season saved.');
    if (ok) delete drafts[season.id];
  }

  async function add(event) {
    event.preventDefault();
    try {
      check(adding);
    } catch (error) {
      return toasts.error(error.message);
    }
    const id = `${adding.year}-season-${adding.number}`;
    const ok = await run('new', () => backend.saveSeason({ id, ...adding, name: adding.name.trim() }, true), `${adding.name.trim()} added.`);
    if (ok) adding = { name: '', year: thisYear, number: null };
  }

  const remove = (season) => run(season.id, () => backend.deleteSeason(season.id), `${season.name} deleted.`);
</script>

<div class="table">
  <div class="head eyebrow">
    <span>Name</span>
    <span>Year</span>
    <span>Number</span>
    <span>Curve</span>
    <span></span>
  </div>

  {#each app.seasons as season (season.id)}
    {@const draft = draftFor(season)}
    {@const fit = app.fitOf(season)}
    <div class="row" class:busy={busyId === season.id}>
      <input class="input compact" aria-label="Name" value={draft.name} oninput={(e) => change(season, 'name', e.currentTarget.value)} />
      <input class="input compact" type="number" aria-label="Year" value={draft.year} oninput={(e) => change(season, 'year', e.currentTarget.valueAsNumber)} />
      <input class="input compact" type="number" aria-label="Season number" value={draft.number} oninput={(e) => change(season, 'number', e.currentTarget.valueAsNumber)} />
      <span>
        <span class="chip {fit.model ? 'good' : 'bad'}" title={fit.error?.message}>
          {season.datapoints.length} datapoint{season.datapoints.length === 1 ? '' : 's'} · {fit.model ? 'fits' : 'no curve'}
        </span>
      </span>
      <span class="actions">
        <button type="button" class="btn small" class:primary={isDirty(season)} disabled={!isDirty(season) || busyId === season.id} onclick={() => save(season)}>
          Save
        </button>
        <ConfirmButton
          confirmLabel="Delete all its data?"
          disabled={busyId === season.id || app.seasons.length === 1}
          onconfirm={() => remove(season)}
        />
      </span>
    </div>
  {/each}

  <form class="row adding" class:busy={busyId === 'new'} onsubmit={add}>
    <input class="input compact" aria-label="New season name" placeholder="2026: Season 6" bind:value={adding.name} />
    <input class="input compact" type="number" aria-label="New season year" bind:value={adding.year} />
    <input class="input compact" type="number" aria-label="New season number" placeholder="6" bind:value={adding.number} />
    <span class="hint">Starts empty; add at least two datapoints.</span>
    <span class="actions">
      <button type="submit" class="btn small primary" disabled={busyId === 'new'}>Add season</button>
    </span>
  </form>
</div>

<style>
  .table {
    --columns: minmax(160px, 2fr) 90px 90px minmax(170px, 1.4fr) 230px;
  }

  .head,
  .row {
    display: grid;
    grid-template-columns: var(--columns);
    align-items: center;
    gap: 8px;
  }

  .head {
    padding-bottom: 8px;
    font-size: 10px;
  }

  .row {
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

  .hint {
    font-size: 11px;
    color: var(--ice-400);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  @media (max-width: 860px) {
    .head {
      display: none;
    }

    .row {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
