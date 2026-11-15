import { ms } from './motion.js';

/** DOM ids shared between components that need to point at each other. */
export const FINDER_PANEL_ID = 'find-my-rank';
export const FINDER_INPUT_ID = 'find-my-rank-input';

/** Bring the finder into view, focus its input and flash the panel. */
export function focusFinder() {
  const panel = document.getElementById(FINDER_PANEL_ID);
  const input = document.getElementById(FINDER_INPUT_ID);
  panel?.scrollIntoView({ block: 'nearest', behavior: ms(1) ? 'smooth' : 'auto' });
  input?.focus({ preventScroll: true });
  input?.select?.();
  panel?.animate(
    [{ filter: 'brightness(1.9)' }, { filter: 'brightness(1)' }],
    { duration: ms(700), easing: 'ease-out' },
  );
}
