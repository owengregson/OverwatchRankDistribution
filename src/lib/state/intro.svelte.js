/**
 * The site's opening sequence, in order:
 *
 *   1. The loading screen (index.html, lib/loader.js) covers the page while
 *      assets load. The app is already built behind it with its entrance
 *      held: CSS animations are paused by the `loading` class on <html>
 *      (styles/base.css), scripted ones wait for `opened`.
 *   2. The loading screen dissolves and `opened` flips to true. The header
 *      and panels animate in underneath it.
 *   3. The curve draws itself (components/DistributionChart.svelte). The
 *      cursor only appears once the visitor picks a point.
 *
 * Anything that should wait for the page to be revealed reads `intro.opened`.
 */
export const intro = $state({ opened: false });
