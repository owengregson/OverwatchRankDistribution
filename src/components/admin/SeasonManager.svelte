<!-- Add, rename and delete seasons. A season's datapoints are managed on the Datapoints tab. -->
<script>
  import ConfirmButton from '@/components/ConfirmButton.svelte';
  import { runAdminAction } from '@/lib/admin.js';
  import { backend } from '@/lib/backend/index.js';
  import { DEFAULT_LADDER, LADDER_CHOICES } from '@/lib/ladder/ladders.js';
  import { app } from '@/lib/state/app.svelte.js';
  import { toasts } from '@/lib/state/toasts.svelte.js';

  const thisYear = new Date().getFullYear();
  const blank = () => ({ name: '', year: thisYear, number: null, ladder: DEFAULT_LADDER });

  /** Edits in progress, by season id. */
  let drafts = $state({});
  let adding = $state(blank());
  let busyId = $state(null);

  /** The fields that can be edited here, as stored. A season with no ladder of its own is on the default one. */
  const fieldsOf = (season) => ({
    name: season.name,
    year: season.year,
    number: season.number,
    ladder: season.ladder ?? DEFAULT_LADDER,
  });
  const draftFor = (season) => drafts[season.id] ?? fieldsOf(season);
  const isDirty = (season) => {
    const draft = drafts[season.id];
    return Boolean(draft) && JSON.stringify(draft) !== JSON.stringify(fieldsOf(season));
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
    if (ok) adding = blank();
  }

  const remove = (season) => run(season.id, () => backend.deleteSeason(season.id), `${season.name} deleted.`);
</script>

<div class="table">
  <div class="head eyebrow">
    <span>Name</span>
    <span>Year</span>
    <span>Number</span>
    <span>Ladder</span>
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
      <!-- Which ladder the season was played on: its ranks are read on that ladder. -->
      <select class="input compact" aria-label="Ladder" value={draft.ladder} onchange={(e) => change(season, 'ladder', e.currentTarget.value)}>
        {#each LADDER_CHOICES as choice (choice.id)}
          <option value={choice.id}>{choice.label}</option>
        {/each}
      </select>
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
    <select class="input compact" aria-label="New season ladder" bind:value={adding.ladder}>
      {#each LADDER_CHOICES as choice (choice.id)}
        <option value={choice.id}>{choice.label}</option>
      {/each}
    </select>
    <span class="hint">Starts empty; add at least two datapoints.</span>
    <span class="actions">
      <button type="submit" class="btn small primary" disabled={busyId === 'new'}>Add season</button>
    </span>
  </form>
</div>

<style>
  .table {
    --columns: minmax(150px, 2fr) 84px 84px 190px minmax(170px, 1.4fr) 220px;
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
