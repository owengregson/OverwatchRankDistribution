/**
 * Season datapoints are small observations of the form
 * "a player at this rank is better than X% of players".
 *
 * Raw shape (as written in a season file):
 *   { "rank": "Master 3", "betterThan": 97, "role": "tank" }
 *   { "sr": 3700, "betterThan": 97, "role": "support", "weight": 2, "note": "dev blog" }
 *
 * - `rank` means the entry SR of that division; use `sr` for an exact value.
 * - `betterThan` is a percentage strictly between 0 and 100.
 * - `role` is the role the figure is for: "tank", "damage" or "support"
 *   (src/data/roles.js). It is kept with the datapoint and does not change
 *   the curve.
 * - `weight` (optional, default 1) makes a trusted point count for more.
 */
import { roleById } from '../../data/roles.js';

/**
 * The highest figure the game shows. Its "higher ranked than" line is in
 * whole percents, so every player in the top 1% reads 99, wherever in that
 * 1% they are: past this figure there is nothing to measure with.
 *
 * So the curve is only ever fitted up to where the top 1% begins. The
 * lowest datapoint at this figure or above is the mark of that, and is
 * fitted like any other. Every datapoint above it that is also at this
 * figure or more is kept, but no curve is fitted to it (`counts` is
 * false), whatever figure it gives: 99 off a rank screen, or 99.3 off a
 * published graph. From the mark upwards the curve is therefore the bell
 * tail that carries on from the datapoints below it, in every season and
 * with every model.
 */
export const HIGHEST_READING = 99;

/**
 * Validates raw datapoints and resolves them onto the SR axis.
 * @returns {{ sr: number, p: number, weight: number, label: string, counts: boolean, id?: string, role?: string, note?: string }[]}
 *          sorted by SR, with `p` as a 0–1 fraction. `counts` is whether
 *          the curve is fitted to the datapoint (see HIGHEST_READING).
 */
export function resolveDatapoints(rawPoints, ladder) {
  if (!Array.isArray(rawPoints)) {
    throw new Error('A season needs a "datapoints" array.');
  }

  /** Whether the lowest datapoint at the game's highest reading or above has been passed: later ones do not count. */
  let marked = false;

  return rawPoints
    .map((raw, i) => {
      const where = `Datapoint #${i + 1}`;
      const hasRank = raw.rank !== undefined;
      const hasSr = raw.sr !== undefined;
      if (hasRank === hasSr) {
        throw new Error(`${where} needs exactly one of "rank" or "sr".`);
      }

      const division = hasRank ? ladder.parseRank(raw.rank) : null;
      const sr = division ? division.minSr : raw.sr;
      if (!Number.isFinite(sr) || sr < ladder.minSr || sr > ladder.maxSr) {
        throw new Error(`${where}: sr must be between ${ladder.minSr} and ${ladder.maxSr}.`);
      }

      const percent = raw.betterThan;
      if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) {
        throw new Error(`${where}: "betterThan" must be a percentage between 0 and 100 (exclusive).`);
      }

      const weight = raw.weight ?? 1;
      if (!Number.isFinite(weight) || weight <= 0) {
        throw new Error(`${where}: "weight" must be a positive number.`);
      }

      if (raw.role !== undefined && raw.role !== null && !roleById(raw.role)) {
        throw new Error(`${where}: "role" must be "tank", "damage" or "support".`);
      }

      return {
        id: raw.id,
        sr,
        p: percent / 100,
        atHighestReading: percent >= HIGHEST_READING,
        weight,
        label: division ? division.name : `${sr} SR`,
        role: raw.role ?? undefined,
        note: raw.note,
      };
    })
    .sort((a, b) => a.sr - b.sr)
    .map(({ atHighestReading, ...point }) => {
      const counts = !(atHighestReading && marked);
      marked ||= atHighestReading;
      return { ...point, counts };
    });
}
