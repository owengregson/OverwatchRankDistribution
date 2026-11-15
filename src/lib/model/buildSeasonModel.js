import { resolveDatapoints } from './datapoints.js';
import { fitNormal } from './fitNormal.js';

/**
 * Curve families a season can ask for via its `"model"` field.
 * To add one, write a fitter with the same signature and return shape as
 * `fitNormal` ({ type, label, params, cdf, pdf, quantile }) and register it here.
 */
const FITTERS = {
  normal: fitNormal,
};

export const DEFAULT_MODEL = 'normal';

/**
 * Builds the distribution for a season purely from its datapoints.
 *
 * @param {{ id: string, model?: string, datapoints: object[] }} season
 * @param {ReturnType<import('../ladder/createLadder.js').createLadder>} ladder
 */
export function buildSeasonModel(season, ladder) {
  const type = season.model ?? DEFAULT_MODEL;
  const fit = FITTERS[type];
  if (!fit) {
    throw new Error(`Unknown model "${type}". Available: ${Object.keys(FITTERS).join(', ')}.`);
  }

  const resolved = resolveDatapoints(season.datapoints, ladder);
  const model = fit(resolved, { minSr: ladder.minSr, maxSr: ladder.maxSr });

  // Keep each datapoint alongside what the fitted curve says at the same SR,
  // so the UI can show how well the model agrees with the data.
  const points = resolved.map((pt) => {
    const fitted = model.cdf(pt.sr);
    return { ...pt, fitted, residual: fitted - pt.p };
  });
  const totalWeight = points.reduce((sum, pt) => sum + pt.weight, 0);
  const rmse = Math.sqrt(
    points.reduce((sum, pt) => sum + pt.weight * pt.residual ** 2, 0) / totalWeight,
  );

  return { ...model, points, rmse };
}
