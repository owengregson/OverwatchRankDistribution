import { DEFAULT_LADDER, LADDERS } from '../../data/ladder.js';
import { createLadder } from './createLadder.js';

/**
 * The ladders in src/data/ladder.js, built into queryable ladders (see
 * createLadder) once each and looked up by id or by season.
 */
const built = new Map();

/** The ladder with this id (the default one if none is given). Throws for an id that does not exist. */
export function ladderById(id = DEFAULT_LADDER) {
  if (!built.has(id)) {
    const config = LADDERS[id];
    if (!config) {
      throw new Error(`Unknown ladder "${id}". Available: ${Object.keys(LADDERS).join(', ')}.`);
    }
    built.set(id, { id, label: config.label, ...createLadder(config) });
  }
  return built.get(id);
}

/** The ladder a season was played on: its `ladder` field, or the default. */
export const ladderOf = (season) => ladderById(season?.ladder ?? DEFAULT_LADDER);

/** Every ladder as { id, label }, for choosing one. */
export const LADDER_CHOICES = Object.entries(LADDERS).map(([id, { label }]) => ({ id, label }));

export { DEFAULT_LADDER };
