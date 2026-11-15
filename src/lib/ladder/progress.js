/**
 * Rank progress: how far through a division a player is, as the game shows
 * it ("Rank progress: 59%"). A rank and its progress together give an exact
 * SR, which is how a datapoint is placed within a division.
 */
import { clamp } from '../math/util.js';

/** The most rank progress there is: at 100% the player is already in the next division. */
export const MAX_PROGRESS = 99;

/** The SR a player `progress` percent of the way through a division sits at. */
export function srAt(division, progress) {
  return Math.round(division.minSr + ((division.maxSr - division.minSr) * progress) / 100);
}

/** The rank progress an SR is at within its division: a whole percent, 0 to MAX_PROGRESS. */
export function progressAt(division, sr) {
  const share = (sr - division.minSr) / (division.maxSr - division.minSr);
  return clamp(Math.round(share * 100), 0, MAX_PROGRESS);
}
