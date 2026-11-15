/**
 * Picks the facts a datapoint needs out of the text read off a rank screen
 * (the game's rank-up or rank progress screen):
 *
 *   TANK                                    the role the rank is held in
 *   CHAMPION 4                              the rank
 *   RANK PROGRESS: 59%                      how far through that division
 *   HIGHER RANKED THAN 99% OF PLAYERS       the share of players it beats
 *
 * Text recognition makes small mistakes ("CHEMPION", a stray symbol), so
 * the words are matched loosely and the numbers strictly. Nothing here
 * touches an image; see readRankScreen.js for that.
 */
import { ROLES } from '../../data/roles.js';

/** Number of single-letter changes (add, drop, swap) that turn `a` into `b`. */
export function editDistance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length];
}

/** How many wrong letters a tier name may have and still count: none for the shortest, two for the longest. */
const lettersOff = (name) => (name.length >= 8 ? 2 : name.length >= 5 ? 1 : 0);

/**
 * A rank in a line of text: a tier name of this ladder with a division
 * number straight after it, e.g. "Champion 4" or a misread "CHEMPION4".
 * @returns {{ tier: object, number: number, off: number } | null} `off` is how many letters were misread
 */
export function readRank(text, ladder) {
  // Spaces are dropped so "GRAND MASTER 3" still reads as one name.
  const squeezed = String(text).toUpperCase().replace(/[^A-Z0-9]/g, '');
  let best = null;
  for (const [, letters, digit] of squeezed.matchAll(/([A-Z]{3,})([0-9])(?![0-9])/g)) {
    const number = Number(digit);
    /** The rank these letters spell. */
    let spelt = null;
    for (const tier of ladder.tiers) {
      if (!tier.divisions.some((division) => division.number === number)) continue;
      const name = tier.name.toUpperCase();
      // The name is whatever the letters end with; try it a letter short and a letter long too.
      for (const length of [name.length, name.length - 1, name.length + 1]) {
        if (length > letters.length) continue;
        const off = editDistance(letters.slice(-length), name);
        if (off > lettersOff(name)) continue;
        // The longest name the letters end with is the one that was written: a misread "GRANOMASTER"
        // ends with a flawless "MASTER", but it is Grandmaster. Between names of one length, fewest wrong letters.
        const longer = spelt && name.length - spelt.tier.name.length;
        if (!spelt || longer > 0 || (longer === 0 && off < spelt.off)) spelt = { tier, number, off };
      }
    }
    // Of several ranks in one text, the one read most cleanly; between equals, the longer name.
    if (spelt && (!best || spelt.off < best.off || (spelt.off === best.off && spelt.tier.name.length > best.tier.name.length))) {
      best = spelt;
    }
  }
  return best;
}

/**
 * The role a single word spells: "TANK", "DAMAGE" or "SUPPORT". The two
 * long names may have one letter misread. Anything in front of the name is
 * let go, because the icon beside it is often read as a stray letter.
 * @returns {string | null} a role id from src/data/roles.js
 */
export function readRole(word) {
  const letters = String(word).toUpperCase().replace(/[^A-Z]/g, '');
  for (const role of ROLES) {
    const name = role.name.toUpperCase();
    if (letters.length >= name.length && letters.endsWith(name)) return role.id;
    if (name.length >= 6 && editDistance(letters, name) <= 1) return role.id;
  }
  return null;
}

/**
 * The role named on a recognised screen, or null if none is, or more than
 * one.
 *
 * The game writes the role over the rank's emblem. So when the line the
 * rank was read from is given, only words above that line and in line with
 * it are looked at: a hero called a tank somewhere else on the screen is
 * not the role.
 *
 * @param {{ words: { text: string, bbox: object }[] }[]} lines
 * @param {{ bbox: object } | null} rankLine
 * @returns {string | null} a role id from src/data/roles.js
 */
export function findRole(lines, rankLine = null) {
  const over = rankLine?.bbox;
  const seen = new Set();
  for (const line of lines) {
    for (const word of line.words) {
      if (over && !(word.bbox.y1 <= over.y0 && word.bbox.x0 < over.x1 && word.bbox.x1 > over.x0)) continue;
      const role = readRole(word.text);
      if (role) seen.add(role);
    }
  }
  return seen.size === 1 ? [...seen][0] : null;
}

/** "12", "12.5" or "12,5" as a number. */
const toNumber = (digits) => Number(digits.replace(',', '.'));

/** The percentage in "RANK PROGRESS: 59%": a whole number from 0 to 100, or null. */
export function readProgress(text) {
  const match = /R[A-Z]{2,4}\s*PR[A-Z0]{4,7}\s*[:;.,]?\s*([0-9]{1,3})(?![0-9.,]*[0-9])/i.exec(text);
  const value = match ? Number(match[1]) : NaN;
  return value >= 0 && value <= 100 ? value : null;
}

/** The percentage in "HIGHER RANKED THAN 99% OF PLAYERS": strictly between 0 and 100, or null. */
export function readBetterThan(text) {
  const match = /H[A-Z]{4,6}\s*R[A-Z]{4,6}\s*TH[A-Z]{1,3}\s*([0-9]{1,3}(?:[.,][0-9]{1,2})?)/i.exec(text);
  const value = match ? toNumber(match[1]) : NaN;
  return value > 0 && value < 100 ? value : null;
}

/** The first number in a scrap of text that should hold nothing else, e.g. "59%". */
export function readNumber(text) {
  const match = /([0-9]{1,3}(?:[.,][0-9]{1,2})?)/.exec(text);
  return match ? toNumber(match[1]) : null;
}

/**
 * Finds the rank, the rank progress and the "higher ranked than" figure in
 * the lines of a recognised screen.
 *
 * @param {{ text: string, bbox: object, words: { text: string, bbox: object }[] }[]} lines
 * @returns each of `rank`, `progress` and `betterThan` is null when not
 *          found; otherwise it carries the line it was read from, and the
 *          numbers the word holding the figure when it stands alone.
 */
export function parseRankScreen(lines, ladder) {
  let rank = null;
  let progress = null;
  let betterThan = null;

  /** The first word with a digit after the word that matches `keyword`. */
  const figureAfter = (line, keyword) => {
    const from = line.words.findIndex((word) => keyword.test(word.text));
    return line.words.slice(from + 1).find((word) => /^[^A-Za-z]*[0-9][0-9.,%]*$/.test(word.text)) ?? null;
  };

  for (const line of lines) {
    const found = readRank(line.text, ladder);
    if (found && (!rank || found.off < rank.off)) rank = { ...found, line };

    if (!progress) {
      const value = readProgress(line.text);
      if (value !== null) progress = { value, line, word: figureAfter(line, /PR[A-Z0]{4,7}/i) };
    }
    if (!betterThan) {
      const value = readBetterThan(line.text);
      if (value !== null) betterThan = { value, line, word: figureAfter(line, /TH[A-Z]{1,3}/i) };
    }
  }
  return { rank, progress, betterThan };
}

/**
 * Settles on one value from several readings of the same figure, given in
 * order of how much each is trusted. The value read most often wins; when
 * no two agree, the most trusted reading does.
 * @returns {{ value: number, agreed: boolean } | null} `agreed` is whether at least two readings matched
 */
export function settle(readings) {
  const values = readings.filter((value) => value !== null && value !== undefined);
  if (!values.length) return null;
  let best = values[0];
  let most = 0;
  for (const value of values) {
    const count = values.filter((other) => other === value).length;
    if (count > most) {
      best = value;
      most = count;
    }
  }
  return { value: best, agreed: most >= 2 };
}
