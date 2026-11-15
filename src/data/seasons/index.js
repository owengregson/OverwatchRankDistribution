/**
 * Season registry. Every `*.json` file in this folder is a season; drop a new
 * file in and it appears in the site, with its curve fitted from its
 * datapoints. See the README for the file format.
 */
const files = import.meta.glob('./*.json', { eager: true, import: 'default' });

/** Oldest first: by year, then season number within the year. */
export const SEASONS = Object.values(files).sort(
  (a, b) => a.year - b.year || a.number - b.number,
);

/** The newest season is shown first. */
export const DEFAULT_SEASON_ID = SEASONS.at(-1)?.id;
