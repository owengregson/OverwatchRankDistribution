/**
 * Publication and "last updated" dates from git history, so they change
 * only when the content behind a page does. Files with uncommitted changes
 * count as changed today; without git (or history) everything is today.
 *
 * The deploy workflow checks out the full history (fetch-depth: 0) so these
 * dates are real in production.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../../', import.meta.url));
const today = () => new Date().toISOString().slice(0, 10);

function git(args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/** { first, last } commit dates (YYYY-MM-DD) touching any of `paths`. */
export function historyOf(paths) {
  const dates = git(['log', '--format=%cs', '--', ...paths]).split('\n').filter(Boolean);
  const dirty = git(['status', '--porcelain', '--', ...paths]) !== '';
  const last = dirty || !dates.length ? today() : dates[0];
  const first = dates.at(-1) ?? today();
  return { first, last };
}

export const latest = (...dates) => dates.sort().at(-1);
