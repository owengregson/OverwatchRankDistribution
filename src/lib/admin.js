import { app, ladder } from '@/lib/state/app.svelte.js';
import { toasts } from '@/lib/state/toasts.svelte.js';

/**
 * Runs an admin action, then reloads the seasons so every curve reflects
 * the change, and reports the outcome as a toast.
 * @returns {Promise<boolean>} whether the action succeeded
 */
export async function runAdminAction(action, successMessage) {
  try {
    await action();
    await app.refreshSeasons();
    if (successMessage) toasts.success(successMessage);
    return true;
  } catch (error) {
    toasts.error(error.message);
    return false;
  }
}

/**
 * Reads what an admin typed in a datapoint's "where" box: a rank name
 * ("Master 3") or an exact SR ("3700").
 * @returns {{ rank: string } | { sr: number }}, or throws with a readable message
 */
export function parseWhere(text) {
  const value = String(text).trim();
  if (/^\d+$/.test(value)) {
    const sr = Number(value);
    if (sr > ladder.maxSr) throw new Error(`SR must be between 0 and ${ladder.maxSr}.`);
    return { sr };
  }
  return { rank: ladder.parseRank(value).name };
}

/** The SR a datapoint or submission refers to, or null if its rank is not recognised. */
export function srOf({ rank, sr }) {
  if (sr !== undefined && sr !== null) return sr;
  try {
    return ladder.parseRank(rank).minSr;
  } catch {
    return null;
  }
}

/** "3 minutes ago", "2 days ago". */
export function timeAgo(iso) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, size] of units) {
    const count = Math.floor(seconds / size);
    if (count >= 1) return `${count} ${name}${count === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}
