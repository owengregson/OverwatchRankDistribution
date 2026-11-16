<!--
  Every datapoint behind a season's curve, as a grid of rank badges: open
  one to edit or delete it, or the last tile to add one, and watch how well
  the fitted curve agrees with each.
-->
<script>
  import DatapointTile from '@/components/admin/DatapointTile.svelte';
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
  /**
   * The datapoints the curve is not fitted to, by id, with why: 'above' for
   * one at the game's highest figure, 99%, or more that is above the lowest
   * that is, and 'floor' for that lowest one when it reads 99% and the
   * curve is already above it (see HIGHEST_READING in
   * lib/model/datapoints.js).
   */
  const leftOut = $derived(
    new Map(fit.model?.points.filter((pt) => !pt.counts).map((pt) => [pt.id, pt.floor ? 'floor' : 'above'])),
  );
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

<p class="hint">
  Each badge is a datapoint, lowest rank first. Open one to see and edit it; the last tile adds one.
  {#if leftOut.size}
    A faded badge is a datapoint in the top 1% that the curve is not fitted to: the game shows 99% for all of the top 1%, so
    such a reading only says "at least 99%". Open one to see why it is left out.
  {/if}
</p>

<!-- Closed tiles pack into rows; an open one takes a row to itself (see DatapointTile). -->
<div class="points">
  {#each points as point (point.id ?? `${point.rank ?? point.sr}-${point.betterThan}`)}
    <DatapointTile seasonId={season.id} {ladder} {point} model={fit.model} leftOut={leftOut.get(point.id) ?? null} />
  {/each}

  <DatapointTile seasonId={season.id} {ladder} />
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

  .hint {
    margin: 12px 0 8px;
    font-size: 11px;
    color: var(--ice-400);
  }

  .points {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(54px, 1fr));
    gap: 5px;
  }
</style>
