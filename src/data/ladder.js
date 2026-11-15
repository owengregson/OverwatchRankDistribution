/**
 * The competitive ladders: tiers from lowest to highest, each split into
 * divisions (5 = lowest, 1 = highest).
 *
 * The ladder has changed over the game's life, so there is more than one
 * here (LADDERS) and each season says which it was played on with its
 * `ladder` field. A season that does not say uses DEFAULT_LADDER.
 *
 * Within a ladder, a tier starts at its `minSr` and runs up to the next
 * tier's `minSr`, so the widths fall out of the list. Every ladder covers
 * the same SR axis, 0 to `maxSr`.
 *
 * TIERS describes each tier once, whichever ladder it appears on:
 *
 * `color` is the tier's official accent colour.
 *
 * `glow` is the light effect behind the icon, as in game: metal tiers have
 * none, then 'soft', 'bright', 'radiant', 'flare' and 'blaze' (see RankAura.svelte).
 *
 * `icon` is the tier's image in `assets/images`. The images vary in shape
 * and scale; their sizes are measured, not written here. After adding or
 * replacing one, run `node scripts/measure-icons.mjs` so every rank is
 * drawn at the same visual size (see src/lib/ladder/iconSizing.js).
 */
const TIERS = {
  bronze: { id: 'bronze', name: 'Bronze', color: '#ce7a54', icon: 'Rank_Bronze_c.png' },
  silver: { id: 'silver', name: 'Silver', color: '#c6c8ca', icon: 'Rank_Silver_c.png' },
  gold: { id: 'gold', name: 'Gold', color: '#daa73e', icon: 'Rank_Gold_c.png' },
  platinum: { id: 'platinum', name: 'Platinum', aliases: ['plat'], color: '#98d9ba', icon: 'Rank_Platinum_c.png' },
  emerald: { id: 'emerald', name: 'Emerald', color: '#00d87f', glow: 'soft', icon: 'Rank_Emerald_c.png' },
  diamond: { id: 'diamond', name: 'Diamond', color: '#5d9ef2', glow: 'bright', icon: 'Rank_Diamond_c.png' },
  master: {
    id: 'master',
    name: 'Master',
    aliases: ['masters'],
    color: '#8ae956',
    glow: 'radiant',
    icon: 'Rank_Master_c.png',
  },
  grandmaster: {
    id: 'grandmaster',
    name: 'Grandmaster',
    aliases: ['grandmasters', 'gm'],
    color: '#8b6ffc',
    glow: 'flare',
    icon: 'Rank_Grandmaster_c.png',
  },
  champion: {
    id: 'champion',
    name: 'Champion',
    aliases: ['champions', 'champ'],
    color: '#cd7dfc',
    glow: 'blaze',
    icon: 'Rank_Champion_c.png',
  },
};

/** A ladder's tiers from [tier id, the SR it starts at] pairs, lowest first. */
const tiersFrom = (starts) => starts.map(([id, minSr]) => ({ ...TIERS[id], minSr }));

/** Shared by every ladder. */
const SHAPE = {
  maxSr: 5000,
  divisionsPerTier: 5,
  /** The plate image for a division number. */
  divisionIcon: (number) => `Division_${number}.png`,
};

export const LADDERS = {
  /**
   * Today's ladder, with Emerald between Platinum and Diamond.
   * Bronze is 1000 SR wide, the rest 500.
   */
  emerald: {
    ...SHAPE,
    label: 'With Emerald (current)',
    tiers: tiersFrom([
      ['bronze', 0],
      ['silver', 1000],
      ['gold', 1500],
      ['platinum', 2000],
      ['emerald', 2500],
      ['diamond', 3000],
      ['master', 3500],
      ['grandmaster', 4000],
      ['champion', 4500],
    ]),
  },

  /**
   * The ladder before Emerald was added. Diamond and above sit where they
   * do today; without Emerald the tiers below are each 500 SR higher, and
   * Bronze is 1500 SR wide.
   */
  classic: {
    ...SHAPE,
    label: 'Before Emerald',
    tiers: tiersFrom([
      ['bronze', 0],
      ['silver', 1500],
      ['gold', 2000],
      ['platinum', 2500],
      ['diamond', 3000],
      ['master', 3500],
      ['grandmaster', 4000],
      ['champion', 4500],
    ]),
  },
};

/** The ladder of a season that does not name one. */
export const DEFAULT_LADDER = 'emerald';

/** Today's ladder on its own, for code that only ever deals with the current one. */
export const LADDER_CONFIG = LADDERS[DEFAULT_LADDER];
