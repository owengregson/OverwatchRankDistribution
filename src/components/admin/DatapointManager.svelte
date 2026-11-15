<!--
  Every datapoint behind a season's curve: edit, add or delete them and
  watch how well the fitted curve agrees with each one.
-->
<script>
  import DatapointRow from '@/components/admin/DatapointRow.svelte';
  import Select from '@/components/Select.svelte';
  import { srOf } from '@/lib/admin.js';
  import { formatSr } from '@/lib/format.js';
  import { app } from '@/lib/state/app.svelte.js';

  let seasonId = $state(app.seasonId);

  const season = $derived(app.seasons.find((s) => s.id === seasonId) ?? app.season);
  /** Ranks here are read on the chosen season's ladder, which may not be the one on the chart. */
  const ladder = $derived(app.ladderOf(season));
  const fit = $derived(app.fitOf(season));
  const points = $derived(
    [...season.datapoints].sort((a, b) => (srOf(a, ladder) ?? 0) - (srOf(b, ladder) ?? 0)),
  );
  const median = $derived(fit.model?.quantile(0.5));
</script>

<div class="toolbar">
  <div class="field">
    <span class="label">Season</span>
    <Select bind:value={seasonId} label="Season" options={app.seasons.map((s) => ({ value: s.id, label: s.name }))} />
  </div>

  {#if fit.model}
    <dl class="fit">
      <div>
        <dt class="eyebrow">Datapoints</dt>
        <dd class="display numeric">{points.length}</dd>
      </div>
      <div>
        <dt class="eyebrow">Median</dt>
        <dd class="display numeric">{formatSr(median)} <small>{ladder.divisionAt(median).name}</small></dd>
      </div>
      <div>
        <dt class="eyebrow">Spread</dt>
        <dd class="display numeric">{formatSr(fit.model.sd)} <small>SR</small></dd>
      </div>
      <div>
        <dt class="eyebrow">Average miss</dt>
        <dd class="display numeric">{(fit.model.rmse * 100).toFixed(2)} <small>pts</small></dd>
      </div>
    </dl>
  {:else}
    <p class="problem" role="alert">
      <span class="chip bad">Cannot fit a curve</span>
      {fit.error.message}
    </p>
  {/if}
</div>

<div class="table">
  <div class="head eyebrow">
    <span>Rank or SR</span>
    <span>Better than</span>
    <span>Weight</span>
    <span>Note</span>
    <span class="right">Curve says</span>
    <span></span>
  </div>

  {#each points as point (point.id ?? `${point.rank ?? point.sr}-${point.betterThan}`)}
    <DatapointRow seasonId={season.id} {ladder} {point} model={fit.model} />
  {/each}

  <DatapointRow seasonId={season.id} {ladder} />
</div>

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px 28px;
  }

  .toolbar .field {
    min-width: 220px;
  }

  .fit {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 28px;
    margin: 0;
  }

  .fit dt {
    font-size: 10px;
  }

  .fit dd {
    margin: 2px 0 0;
    font-size: 28px;
  }

  small {
    font-family: var(--font-body);
    font-weight: var(--font-body-weight);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--ice-400);
    text-transform: none;
  }

  .problem {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    color: var(--ice-200);
  }

  .table {
    --columns: minmax(130px, 1.2fr) 110px 76px minmax(120px, 2fr) 84px 170px;
    margin-top: 6px;
  }

  .head {
    display: grid;
    grid-template-columns: var(--columns);
    gap: 8px;
    padding-bottom: 8px;
    font-size: 10px;
  }

  .right {
    text-align: right;
  }

  @media (max-width: 860px) {
    .head {
      display: none;
    }
  }
</style>
