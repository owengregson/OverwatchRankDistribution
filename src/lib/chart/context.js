import { getContext, setContext } from 'svelte';

const KEY = Symbol('chart');

/**
 * The chart shares its geometry with its layers through context, so each
 * layer component only declares what it draws.
 *
 * Shape (all reactive getters):
 *   scales      pixel mapping from `createScales`
 *   ids         unique ids for <defs> (gradients, clip paths, masks)
 *   cursorX     pixel x of the probe
 *   reveal      0…1 progress of the intro wipe
 *   densityAt   (sr) => density on the drawn (possibly morphing) curve
 *   curve/area  SVG path strings
 *   peak        highest drawn density
 */
export const setChart = (chart) => setContext(KEY, chart);
export const getChart = () => getContext(KEY);
