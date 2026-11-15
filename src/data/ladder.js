/**
 * The competitive ladder: tiers from lowest to highest, each split into
 * divisions (5 = lowest, 1 = highest).
 *
 * A tier starts at `minSr` and runs up to the next tier's `minSr`, so the
 * widths fall out of this list (Bronze is 1000 SR wide, the rest 500).
 *
 * `color` is the tier's official accent colour.
 *
 * `glow` is the light effect behind the icon, as in game: metal tiers have
 * none, then 'soft', 'radiant', 'flare' and 'blaze' (see RankAura.svelte).
 *
 * `icon` is the tier's image in `assets/images`. The images vary in shape
 * and scale; their sizes are measured, not written here. After adding or
 * replacing one, run `node scripts/measure-icons.mjs` so every rank is
 * drawn at the same visual size (see src/lib/ladder/iconSizing.js).
 */
export const LADDER_CONFIG = {
  maxSr: 5000,
  divisionsPerTier: 5,
  /** The plate image for a division number. */
  divisionIcon: (number) => `Division_${number}.png`,
  tiers: [
    {
      id: 'bronze',
      name: 'Bronze',
      minSr: 0,
      color: '#ce7a54',
      icon: 'Rank_Bronze_c.png',
    },
    {
      id: 'silver',
      name: 'Silver',
      minSr: 1000,
      color: '#c6c8ca',
      icon: 'Rank_Silver_c.png',
    },
    {
      id: 'gold',
      name: 'Gold',
      minSr: 1500,
      color: '#daa73e',
      icon: 'Rank_Gold_c.png',
    },
    {
      id: 'platinum',
      name: 'Platinum',
      aliases: ['plat'],
      minSr: 2000,
      color: '#98d9ba',
      icon: 'Rank_Platinum_c.png',
    },
    {
      id: 'emerald',
      name: 'Emerald',
      minSr: 2500,
      color: '#00d87f',
      glow: 'soft',
      icon: 'Rank_Emerald_c.png',
    },
    {
      id: 'diamond',
      name: 'Diamond',
      minSr: 3000,
      color: '#5d9ef2',
      glow: 'soft',
      icon: 'Rank_Diamond_c.png',
    },
    {
      id: 'master',
      name: 'Master',
      aliases: ['masters'],
      minSr: 3500,
      color: '#8ae956',
      glow: 'radiant',
      icon: 'Rank_Master_c.png',
    },
    {
      id: 'grandmaster',
      name: 'Grandmaster',
      aliases: ['grandmasters', 'gm'],
      minSr: 4000,
      color: '#8b6ffc',
      glow: 'flare',
      icon: 'Rank_Grandmaster_c.png',
    },
    {
      id: 'champion',
      name: 'Champion',
      aliases: ['champions', 'champ'],
      minSr: 4500,
      color: '#cd7dfc',
      glow: 'blaze',
      icon: 'Rank_Champion_c.png',
    },
  ],
};
