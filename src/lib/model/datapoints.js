/**
 * Season datapoints are small observations of the form
 * "a player at this rank is better than X% of players".
 *
 * Raw shape (as written in a season file):
 *   { "rank": "Master 3", "betterThan": 97 }
 *   { "sr": 3700, "betterThan": 97, "weight": 2, "note": "dev blog" }
 *
 * - `rank` means the entry SR of that division; use `sr` for an exact value.
 * - `betterThan` is a percentage strictly between 0 and 100.
 * - `weight` (optional, default 1) makes a trusted point count for more.
 */

/**
 * Validates raw datapoints and resolves them onto the SR axis.
 * @returns {{ sr: number, p: number, weight: number, label: string, note?: string }[]}
 *          sorted by SR, with `p` as a 0–1 fraction.
 */
export function resolveDatapoints(rawPoints, ladder) {
  if (!Array.isArray(rawPoints)) {
    throw new Error('A season needs a "datapoints" array.');
  }

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

      return {
        sr,
        p: percent / 100,
        weight,
        label: division ? division.name : `${sr} SR`,
        note: raw.note,
      };
    })
    .sort((a, b) => a.sr - b.sr);
}
