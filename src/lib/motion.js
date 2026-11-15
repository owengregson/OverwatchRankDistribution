import { backOut, cubicOut } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';

/** A duration in ms, or 0 when the visitor has asked for reduced motion. */
export const ms = (duration) => (prefersReducedMotion.current ? 0 : duration);

/** Transition: scale up with a little overshoot while fading in. */
export function pop(node, { duration = 240, delay = 0, from = 0.55 } = {}) {
  return {
    duration: ms(duration),
    delay,
    easing: backOut,
    css: (t) => `transform: scale(${from + (1 - from) * t}); opacity: ${Math.min(1, t * 1.8)};`,
  };
}

/** Transition: fade while sliding a few pixels along y. */
export function slide(node, { duration = 220, delay = 0, y = 8 } = {}) {
  return {
    duration: ms(duration),
    delay,
    easing: cubicOut,
    css: (t) => `transform: translateY(${(1 - t) * y}px); opacity: ${t};`,
  };
}

/** Transition: plain fade that respects reduced motion. */
export function dissolve(node, { duration = 140, delay = 0 } = {}) {
  return { duration: ms(duration), delay, css: (t) => `opacity: ${t};` };
}
