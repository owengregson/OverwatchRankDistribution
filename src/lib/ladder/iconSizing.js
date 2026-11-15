/**
 * Makes every rank icon look the same size.
 *
 * The icon files are not drawn to one scale: each was cropped tight and
 * sized so its longest side is about 430 pixels. Drawn as supplied, a tall,
 * solid emblem (Emerald) looks far bigger than a wide, spindly one
 * (Grandmaster), even though both files are "430 pixels".
 *
 * How big an emblem looks follows how much of the screen it actually
 * covers, so each icon is scaled until all of them cover the same area:
 *
 *   painted area = width × height × coverage      (from iconMetrics.json)
 *   scale        = √(reference area ÷ painted area)
 *
 * The reference is the median icon, so a typical icon keeps its size and
 * the others move towards it. Measurements come from
 * `node scripts/measure-icons.mjs`; run it after changing an image and the
 * sizes rebalance on their own.
 */

/**
 * How far to go: 1 gives every icon the same painted area, 0 leaves the
 * files as supplied. Values in between blend the two.
 */
const BALANCE = 1;

/**
 * The division plate artwork is supplied at a smaller pixel scale than the
 * icons. This factor brings it to its in-game size beside them.
 */
const PLATE_SCALE = 2.28;

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/**
 * @param ladder  from createLadder
 * @param metrics contents of src/data/iconMetrics.json
 * @returns sizes in "balanced pixels": a shared unit in which the icons are
 *          comparable. `box` is the smallest box that fits any icon.
 */
export function createIconSizing(ladder, metrics) {
  const measure = (file) => {
    const found = metrics[file];
    if (!found) throw new Error(`No measurements for "${file}". Run: node scripts/measure-icons.mjs`);
    return found;
  };
  const paintedArea = ({ width, height, coverage }) => width * height * coverage;

  const reference = median(ladder.tiers.map((tier) => paintedArea(measure(tier.icon))));

  const icons = new Map(
    ladder.tiers.map((tier) => {
      const size = measure(tier.icon);
      const scale = Math.sqrt(reference / paintedArea(size)) ** BALANCE;
      return [tier.id, { scale, width: size.width * scale, height: size.height * scale }];
    }),
  );

  const plate = measure(ladder.divisionIcon(1));

  return {
    /** { scale, width, height } for a tier's icon. `scale` is balanced pixels per pixel of its file. */
    icon: (tier) => icons.get(tier.id),
    box: {
      width: Math.max(...[...icons.values()].map((icon) => icon.width)),
      height: Math.max(...[...icons.values()].map((icon) => icon.height)),
    },
    plate: { width: plate.width * PLATE_SCALE, height: plate.height * PLATE_SCALE },
  };
}
