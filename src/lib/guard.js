/**
 * Blocks the usual ways of opening the browser's developer tools and page
 * source: the right-click menu and the keyboard shortcuts.
 *
 * This is a deterrent, not security. A browser's own menu can still open
 * the tools, and nothing shipped to a browser can be truly hidden.
 */

/** Shortcuts as [key, needs Ctrl/Cmd, needs Shift, needs Alt]. Keys are lower-case. */
const BLOCKED_SHORTCUTS = [
  ['f12', false, false, false], // DevTools
  ['i', true, true, false], //     DevTools (Windows/Linux)
  ['j', true, true, false], //     Console
  ['c', true, true, false], //     Element picker
  ['k', true, true, false], //     Firefox console
  ['e', true, true, false], //     Firefox network
  ['m', true, true, false], //     Responsive design mode
  ['u', true, false, false], //    View source
  ['s', true, false, false], //    Save page
  ['i', true, false, true], //     DevTools (macOS: Cmd+Opt+I)
  ['j', true, false, true], //     Console (macOS)
  ['c', true, false, true], //     Element picker (macOS)
  ['u', true, false, true], //     View source (macOS)
  ['f7', false, true, false], //   Firefox style editor
];

function isBlocked(event) {
  const key = event.key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;
  return BLOCKED_SHORTCUTS.some(
    ([k, needsMod, needsShift, needsAlt]) =>
      k === key && mod === needsMod && event.shiftKey === needsShift && event.altKey === needsAlt,
  );
}

const cancel = (event) => event.preventDefault();

export function discourageInspecting() {
  // Capture phase, so nothing on the page sees these events first.
  window.addEventListener('contextmenu', cancel, { capture: true });
  window.addEventListener('dragstart', cancel, { capture: true });
  window.addEventListener(
    'keydown',
    (event) => {
      if (isBlocked(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    { capture: true },
  );
}
