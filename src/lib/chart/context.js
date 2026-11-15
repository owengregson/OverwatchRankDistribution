import { getContext, setContext } from 'svelte';

const KEY = Symbol('chart');

/**
 * The chart shares its geometry with its layers through context, so each
 * layer component only declares what it draws.
 *
 * Shape (all reactive getters, except `ramp` and `densityAt`):
 *   scales      pixel mapping from `createScales`
 *   ramp        the curve's colour at every SR, from `createTierRamp`
 *   points      the curve's samples in pixels: { xs, ys }
 *   densityAt   (sr) => density on the drawn (possibly morphing) curve
 *   peak        highest drawn density
 *   cursorX     pixel x of the probe
 *   splitX      pixel x where the lit part of the curve ends and the dim part begins
 *   reveal      0…1 progress of the curve drawing itself in the intro
 *   presence    0…1 how present the cursor is: 0 until the visitor first picks a point
 */
export const setChart = (chart) => setContext(KEY, chart);
export const getChart = () => getContext(KEY);
