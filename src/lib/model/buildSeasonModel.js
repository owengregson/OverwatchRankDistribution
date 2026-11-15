import { resolveDatapoints } from './datapoints.js';
import { fitFreeform } from './fitFreeform.js';
import { fitNormal } from './fitNormal.js';

/**
 * The curves a season can ask for with its `"model"` field.
 *
 * `normal` assumes a bell curve and finds the one closest to the datapoints:
 * right for a handful of community figures, which are few, bunched together
 * and a little noisy. `freeform` assumes nothing and passes through every
 * datapoint: right for a season whose whole distribution is known, which it
 * then reproduces, bumps and all.
 *
 * To add one, write a fitter with the same signature and return shape as
 * `fitNormal` ({ type, params, cdf, pdf, quantile }) and register it here.
 */
const MODELS = {
  normal: { label: 'Bell curve', fit: fitNormal },
  freeform: { label: 'Follows the data', fit: fitFreeform },
};

export const DEFAULT_MODEL = 'normal';

/** Every model as { id, label }, for choosing one. */
export const MODEL_CHOICES = Object.entries(MODELS).map(([id, { label }]) => ({ id, label }));

/** SR between the slices the curve is cut into to measure its mean and spread. */
const MOMENT_STEP = 5;

/**
 * The mean and standard deviation of a fitted curve, in SR, measured from
 * the curve itself so they mean the same thing whatever its shape.
 */
function moments({ cdf, minSr, maxSr }) {
  let mean = 0;
  let square = 0;
  let below = cdf(minSr);
  for (let sr = minSr; sr < maxSr; sr += MOMENT_STEP) {
    const upTo = cdf(Math.min(sr + MOMENT_STEP, maxSr));
    const middle = sr + MOMENT_STEP / 2;
    mean += middle * (upTo - below);
    square += middle * middle * (upTo - below);
    below = upTo;
  }
  return { mean, sd: Math.sqrt(Math.max(0, square - mean * mean)) };
}

/**
 * Builds the distribution for a season purely from its datapoints.
 *
 * @param {{ id: string, model?: string, datapoints: object[] }} season
 * @param {ReturnType<import('../ladder/createLadder.js').createLadder>} ladder
 */
export function buildSeasonModel(season, ladder) {
  const type = season.model ?? DEFAULT_MODEL;
  const chosen = MODELS[type];
  if (!chosen) {
    throw new Error(`Unknown model "${type}". Available: ${Object.keys(MODELS).join(', ')}.`);
  }

  const resolved = resolveDatapoints(season.datapoints, ladder);
  const lowest = ladder.divisions[0];
  const highest = ladder.divisions.at(-1);
  // Whichever curve it is, it is fitted only to the datapoints that count: of those reading
  // the game's highest figure, 99%, that is the lowest one alone (see HIGHEST_READING).
  const model = chosen.fit(
    resolved.filter((pt) => pt.counts),
    {
      minSr: ladder.minSr,
      maxSr: ladder.maxSr,
      floorWidth: lowest.maxSr - lowest.minSr,
      ceilingWidth: highest.maxSr - highest.minSr,
    },
  );

  // Keep each datapoint alongside what the fitted curve says at the same SR,
  // so the UI can show how well the model agrees with the data. The miss is
  // measured over the datapoints the curve was fitted to.
  const points = resolved.map((pt) => {
    const fitted = model.cdf(pt.sr);
    return { ...pt, fitted, residual: fitted - pt.p };
  });
  const counted = points.filter((pt) => pt.counts);
  const totalWeight = counted.reduce((sum, pt) => sum + pt.weight, 0);
  const rmse = Math.sqrt(
    counted.reduce((sum, pt) => sum + pt.weight * pt.residual ** 2, 0) / totalWeight,
  );

  return { ...model, label: chosen.label, ...moments(model), points, rmse };
}

/**
 * Like `buildSeasonModel`, but reports a season that cannot be fitted
 * (too few datapoints, contradictory ones…) instead of throwing.
 * @returns {{ model: object, error: null } | { model: null, error: Error }}
 */
export function tryBuildSeasonModel(season, ladder) {
  try {
    return { model: buildSeasonModel(season, ladder), error: null };
  } catch (error) {
    return { model: null, error };
  }
}
