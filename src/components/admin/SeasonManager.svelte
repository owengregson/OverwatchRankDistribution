<!--
  Add, rename and delete seasons, and say where each is in the site's
  header: a tab of its own, or in the "Older Seasons" menu. A season's
  datapoints are managed on the Datapoints tab.
-->
<script>
  import ConfirmButton from '@/components/ConfirmButton.svelte';
  import Select from '@/components/Select.svelte';
  import { runAdminAction } from '@/lib/admin.js';
  import { backend } from '@/lib/backend/index.js';
  import { DEFAULT_LADDER, LADDER_CHOICES } from '@/lib/ladder/ladders.js';
  import { DEFAULT_MODEL, MODEL_CHOICES } from '@/lib/model/buildSeasonModel.js';
  import { app } from '@/lib/state/app.svelte.js';
  import { toasts } from '@/lib/state/toasts.svelte.js';

  const thisYear = new Date().getFullYear();
  const blank = () => ({ name: '', year: thisYear, number: null, ladder: DEFAULT_LADDER, model: DEFAULT_MODEL, older: false });

  /** The ladders and curves on offer, as dropdown options. */
  const LADDERS = LADDER_CHOICES.map(({ id, label }) => ({ value: id, label }));
  const MODELS = MODEL_CHOICES.map(({ id, label }) => ({ value: id, label }));
  /** Where a season can be in the header, as the value of its `older` field. */
  const PLACES = [
    { value: false, label: 'Own tab' },
    { value: true, label: 'Older Seasons' },
  ];
  const PLACE_HINT =
    'Where the season is in the header for every visitor: a tab of its own, or in the "Older Seasons" menu. A season only shows once it has a curve.';

  /** What the curve choices do, shown when one is hovered. */
  const MODEL_HINT =
    'Bell curve: the bell closest to the datapoints, for a few community figures. Follows the data: passes through every datapoint, for a season whose whole distribution is known.';

  /** Edits in progress, by season id. */
  let drafts = $state({});
  let adding = $state(blank());
  let busyId = $state(null);

  /** The fields that can be edited here, as stored. A season with no ladder or model of its own uses the default one. */
  const fieldsOf = (season) => ({
    name: season.name,
    year: season.year,
    number: season.number,
    ladder: season.ladder ?? DEFAULT_LADDER,
    model: season.model ?? DEFAULT_MODEL,
    older: Boolean(season.older),
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
    <span>In the header</span>
    <span>Fit</span>
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
      <Select compact label="Ladder" value={draft.ladder} options={LADDERS} onchange={(value) => change(season, 'ladder', value)} />
      <!-- Which curve is fitted to the season's datapoints. -->
      <Select compact label="Curve" title={MODEL_HINT} value={draft.model} options={MODELS} onchange={(value) => change(season, 'model', value)} />
      <!-- Whether the season has a tab in the header or sits in its "Older Seasons" menu. -->
      <Select compact label="In the header" title={PLACE_HINT} value={draft.older} options={PLACES} onchange={(value) => change(season, 'older', value)} />
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
    <Select compact label="New season ladder" bind:value={adding.ladder} options={LADDERS} />
    <Select compact label="New season curve" title={MODEL_HINT} bind:value={adding.model} options={MODELS} />
    <Select compact label="New season: in the header" title={PLACE_HINT} bind:value={adding.older} options={PLACES} />
    <span class="hint">Starts empty; add at least two datapoints.</span>
    <span class="actions">
      <button type="submit" class="btn small primary" disabled={busyId === 'new'}>Add season</button>
    </span>
  </form>
</div>

<style>
  .table {
    --columns: minmax(130px, 2fr) 70px 62px 168px 138px 132px minmax(150px, 1.4fr) 190px;
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
