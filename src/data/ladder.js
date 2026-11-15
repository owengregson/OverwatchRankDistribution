/**
 * The competitive ladder: tiers from lowest to highest, each split into
 * divisions (5 = lowest, 1 = highest).
 *
 * A tier starts at `minSr` and runs up to the next tier's `minSr`, so the
 * widths fall out of this list (Bronze is 1000 SR wide, the rest 500).
 *
 * `icon.width` / `icon.height` are the pixel sizes of the cropped artwork in
 * `assets/images`. The crops all come from the same canvas, so RankBadge uses
 * these numbers to draw every icon at one shared scale. Update them if an
 * image is replaced.
 */
export const LADDER_CONFIG = {
  maxSr: 5000,
  divisionsPerTier: 5,
  divisionIcon: { file: (number) => `Division_${number}.png`, width: 174, height: 80 },
  tiers: [
    {
      id: 'bronze',
      name: 'Bronze',
      minSr: 0,
      color: '#d07c46',
      icon: { file: 'Rank_Bronze_c.png', width: 422, height: 357 },
    },
    {
      id: 'silver',
      name: 'Silver',
      minSr: 1000,
      color: '#b4bdc9',
      icon: { file: 'Rank_Silver_c.png', width: 346, height: 417 },
    },
    {
      id: 'gold',
      name: 'Gold',
      minSr: 1500,
      color: '#ecb746',
      icon: { file: 'Rank_Gold_c.png', width: 388, height: 422 },
    },
    {
      id: 'platinum',
      name: 'Platinum',
      aliases: ['plat'],
      minSr: 2000,
      color: '#8fd2dc',
      icon: { file: 'Rank_Platinum_c.png', width: 389, height: 419 },
    },
    {
      id: 'emerald',
      name: 'Emerald',
      minSr: 2500,
      color: '#35d695',
      icon: { file: 'Rank_Emerald_c.png', width: 382, height: 418 },
    },
    {
      id: 'diamond',
      name: 'Diamond',
      minSr: 3000,
      color: '#6ea6ff',
      icon: { file: 'Rank_Diamond_c.png', width: 431, height: 408 },
    },
    {
      id: 'master',
      name: 'Master',
      aliases: ['masters'],
      minSr: 3500,
      color: '#b4f0d6',
      icon: { file: 'Rank_Master_c.png', width: 432, height: 348 },
    },
    {
      id: 'grandmaster',
      name: 'Grandmaster',
      aliases: ['grandmasters', 'gm'],
      minSr: 4000,
      color: '#a99bff',
      icon: { file: 'Rank_Grandmaster_c.png', width: 430, height: 273 },
    },
    {
      id: 'champion',
      name: 'Champion',
      aliases: ['champions', 'champ'],
      minSr: 4500,
      color: '#d683f5',
      icon: { file: 'Rank_Champion_c.png', width: 430, height: 313 },
    },
  ],
};
