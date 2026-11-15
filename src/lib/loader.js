/**
 * Runs the loading screen (markup in index.html, styles in
 * src/styles/loader.css): loads everything the site draws with, shows how
 * far along that is, then opens the page.
 *
 * What is loaded: the fonts, every image in assets/images, the cursors,
 * and anything else the caller is waiting for (the season data). Each is
 * one step of the bar. A step that fails still counts: a missing image
 * should not keep anyone out of the site.
 */
import { imageUrls } from '@/lib/assets.js';
import { CURSORS } from '@/lib/cursor/cursors.js';
import { intro } from '@/lib/state/intro.svelte.js';

/** One entry per font file, written the way CSS names a font. */
const FONTS = ['400 1em "Big Noodle Titling"', 'italic 400 1em "Big Noodle Titling"', '700 1em "Config"'];

/** Timings in ms. */
const TIMING = {
  /**
   * The screen stays up at least this long. Kept very short: when
   * everything is already cached the visitor sees the bar sweep across
   * once and the site is there.
   */
  shortest: 150,
  /** After this long the page opens with whatever has arrived. */
  longest: 9000,
  /** The full bar flashes for this long before the screen starts to go. */
  flash: 120,
  /** The screen's dissolve, after which it is removed. Matches the transition in loader.css. */
  dissolve: 800,
  /** How far into the dissolve the page underneath starts its entrance. */
  entrance: 140,
};

/**
 * How the bar moves towards the share of work that is done, in shares of
 * the bar per second: it eases in on its target, between these speeds. At
 * the fastest an already-loaded site fills the bar in about a fifth of a
 * second, which is the least time the loading screen can take.
 */
const FILL = { fastest: 5, slowest: 1.5, ease: 14 };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls back on the next animation frame, or shortly after if none comes:
 * a page that is not being shown gets no frames, and the loading must not
 * wait for someone to look at it.
 */
function nextFrame(callback) {
  let called = false;
  const once = () => {
    if (called) return;
    called = true;
    callback();
  };
  requestAnimationFrame(once);
  setTimeout(once, 120);
}

function loadImage(url) {
  const image = new Image();
  image.src = url;
  // decode() also has the image ready to draw, so nothing pops in on first use.
  return image.decode();
}

/**
 * @param {Promise[]} [alsoWaitFor] other work that should be finished before the page opens
 * @returns {Promise<void>} settles when the page has opened
 */
export async function runLoader(alsoWaitFor = []) {
  const root = document.documentElement;
  const screen = document.getElementById('loader');

  function open() {
    root.classList.remove('loading');
    intro.opened = true;
  }

  if (!screen) return open();

  const fonts = FONTS.map((font) => document.fonts.load(font));
  const images = [...imageUrls, ...Object.values(CURSORS).map((cursor) => cursor.src)].map(loadImage);
  const steps = [...fonts, ...images, ...alsoWaitFor];

  let done = 0;
  for (const step of steps) {
    step.catch(() => {}).then(() => (done += 1));
  }
  Promise.allSettled(fonts).then(() => screen.classList.add('has-type'));

  // Fill the bar towards the share of steps that are done.
  const percent = screen.querySelector('.loader__percent');
  const startedAt = performance.now();
  let shown = 0;
  let lastFrame = startedAt;

  await new Promise((filled) => {
    function frame() {
      const now = performance.now();
      const seconds = Math.min(now - lastFrame, 150) / 1000;
      lastFrame = now;

      const elapsed = now - startedAt;
      const target = elapsed >= TIMING.longest ? 1 : done / steps.length;
      const speed = Math.min(FILL.fastest, Math.max(FILL.slowest, (target - shown) * FILL.ease));
      shown = Math.min(target, shown + speed * seconds);

      const whole = Math.round(shown * 100);
      screen.style.setProperty('--progress', shown);
      screen.setAttribute('aria-valuenow', whole);
      percent.textContent = `${whole}%`;

      if (shown >= 1 && elapsed >= TIMING.shortest) return filled();
      nextFrame(frame);
    }
    frame();
  });

  screen.classList.add('is-done');
  await wait(TIMING.flash);
  screen.classList.add('is-opening');
  await wait(TIMING.entrance);
  open();
  await wait(TIMING.dissolve - TIMING.entrance);
  screen.remove();
}
