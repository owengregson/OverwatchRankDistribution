/**
 * Draws the social preview (public/og-image.png, 1200×630) and the app icons
 * (public/icons/*.png) from the site's own ladder, fitted season curve, fonts
 * and logo, with no dependencies. Run again after the ladder, the newest
 * season or the look changes:
 *
 *   npm run images
 *
 * The pieces it draws with (backdrop, curve, lettering) are ./lib/scene.mjs,
 * shared with the README's pictures (./make-readme-images.mjs).
 */
import { SITE } from '../site.config.js';
import { createCanvas, drawLogo, hex } from './lib/raster.mjs';
import { GLOW, ICE_300, LEAN, ORANGE, WHITE, backdrop, mix, oblique, seasonCurve, titling, write } from './lib/scene.mjs';
import { loadSiteData } from './site/data.js';

const site = loadSiteData();

function ogImage() {
  const canvas = createCanvas(SITE.ogImage.width, SITE.ogImage.height);
  backdrop(canvas);

  const left = 72;
  // The logo stands on its own above the title, with no caption beside it.
  drawLogo(canvas, left, 52, 60);

  canvas.fill(oblique.layout('OVERWATCH', 104, left, 214, { skew: LEAN, tracking: 0.02 }), WHITE);
  canvas.fill(oblique.layout('RANK DISTRIBUTION', 104, left, 306, { skew: LEAN, tracking: 0.02 }), ORANGE);
  canvas.fill(
    titling.layout('WHAT PERCENT OF PLAYERS ARE IN EACH RANK', 32, left + 2, 352, { tracking: 0.05 }),
    ICE_300,
  );

  seasonCurve(canvas, site, { left: 60, right: 1140, base: 552, height: 170 });
  return canvas;
}

/** Square app icon: chamfered navy tile with the logo. */
function icon(size) {
  const canvas = createCanvas(size, size);
  const cut = size * 0.16;
  // Lit from the top right, as on the site.
  canvas.fill(
    [[[cut, 0], [size, 0], [size, size - cut], [size - cut, size], [0, size], [0, cut]]],
    GLOW,
    1,
    (x, y) => mix(hex('#24356b'), hex('#0a1230'), Math.min(1, Math.hypot(size - x, y) / (size * 1.2))),
  );
  const logo = size * 0.62;
  drawLogo(canvas, (size - logo) / 2, (size - logo) / 2, logo);
  return canvas;
}

write(`public/${SITE.ogImage.path}`, ogImage());
write('public/icons/icon-512.png', icon(512));
write('public/icons/icon-192.png', icon(192));
write('public/icons/apple-touch-icon.png', icon(180));
