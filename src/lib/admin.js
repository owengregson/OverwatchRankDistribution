import { app } from '@/lib/state/app.svelte.js';
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
 * The SR a datapoint or submission refers to on its season's `ladder`
 * (`app.ladderOf(season)`: a rank only means something on its own ladder),
 * or null if its rank is not on that ladder.
 */
export function srOf({ rank, sr }, ladder) {
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
