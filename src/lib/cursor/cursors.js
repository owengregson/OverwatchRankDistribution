/**
 * The site's cursor set (assets/cursors), drawn by CustomCursor.svelte.
 *
 * Each kind is named by the `--cursor` CSS property in src/styles/cursors.css,
 * which is where you decide which elements get which cursor.
 *
 * `width`, `height` and `hotspot` are in image pixels, as printed by
 * `node scripts/extract-cursors.mjs`. The hotspot is the pixel that does the
 * pointing (the arrow's tip, the fingertip, the middle of the text bar).
 */
import finger from '@assets/cursors/overwatch_finger.png';
import pointer from '@assets/cursors/overwatch_pointer.png';
import text from '@assets/cursors/overwatch_text.png';

/**
 * Image pixels per CSS pixel. At 1.5 the 46px-tall arrow is drawn about
 * 31px tall. A bigger number makes every cursor smaller.
 */
export const CURSOR_SCALE = 1.5;

export const CURSORS = {
  default: { src: pointer, width: 33, height: 46, hotspot: [2, 2] },
  link: { src: finger, width: 43, height: 45, hotspot: [16, 2] },
  text: { src: text, width: 27, height: 48, hotspot: [14, 20] },
};
