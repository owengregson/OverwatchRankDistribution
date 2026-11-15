/**
 * Seasons bundled with the site. Every `*.json` file in this folder is a
 * season, with its curve fitted from its datapoints.
 *
 * Once a database is configured (src/config.js) the live seasons come from
 * there and these files are only what the page shows for the instant before
 * the live data arrives, or if the database cannot be reached.
 */
const files = import.meta.glob('./*.json', { eager: true, import: 'default' });

/** Oldest first: by year, then season number within the year. */
export const sortSeasons = (seasons) =>
  [...seasons].sort((a, b) => a.year - b.year || a.number - b.number);

export const SEASONS = sortSeasons(Object.values(files));
