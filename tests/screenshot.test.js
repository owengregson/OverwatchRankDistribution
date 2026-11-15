import { describe, expect, it } from 'vitest';
import { ladderById } from '../src/lib/ladder/ladders.js';
import {
  editDistance,
  parseRankScreen,
  readBetterThan,
  readNumber,
  readProgress,
  readRank,
  settle,
  srAt,
} from '../src/lib/screenshot/parse.js';

const ladder = ladderById();
const classic = ladderById('classic');

/** A recognised line, as the text reader hands it over: its text and its words, each with a box. */
const line = (text) => ({
  text,
  bbox: { x0: 0, y0: 0, x1: 100, y1: 20 },
  words: text.split(/\s+/).map((word, i) => ({ text: word, bbox: { x0: i * 10, y0: 0, x1: i * 10 + 9, y1: 20 } })),
});

describe('edit distance', () => {
  it('counts the letters that differ', () => {
    expect(editDistance('CHAMPION', 'CHAMPION')).toBe(0);
    expect(editDistance('CHEMPION', 'CHAMPION')).toBe(1);
    expect(editDistance('CHAMPON', 'CHAMPION')).toBe(1);
    expect(editDistance('GOLD', 'COLDS')).toBe(2);
  });
});

describe('reading a rank', () => {
  const rank = (text, on = ladder) => {
    const found = readRank(text, on);
    return found && `${found.tier.name} ${found.number}`;
  };

  it('finds a tier name with its division', () => {
    expect(rank('CHAMPION 4')).toBe('Champion 4');
    expect(rank('Gold 3')).toBe('Gold 3');
    expect(rank('~ PLATINUM1 |')).toBe('Platinum 1');
  });

  it('forgives a misread letter or two in a long name, and none in a short one', () => {
    expect(rank('CHEMPION 4')).toBe('Champion 4');
    expect(rank('DIANOND 2')).toBe('Diamond 2');
    expect(readRank('CHEMPION 4', ladder).off).toBe(1);
    expect(rank('COLD 3')).toBeNull();
    expect(rank('CHXXXXON 4')).toBeNull();
  });

  it('tells Grandmaster from Master, however the words were split', () => {
    expect(rank('GRANDMASTER 2')).toBe('Grandmaster 2');
    expect(rank('GRAND MASTER 2')).toBe('Grandmaster 2');
    expect(rank('MASTER 2')).toBe('Master 2');
  });

  it('needs a division from 1 to 5, and is not fooled by other numbers on the screen', () => {
    expect(rank('CHAMPION')).toBeNull();
    expect(rank('MASTER 7')).toBeNull();
    expect(rank('MAUGA SR 4579')).toBeNull();
    expect(rank('RANK PROGRESS: 59%')).toBeNull();
    expect(rank('HIGHER RANKED THAN 99% OF PLAYERS')).toBeNull();
  });

  it('only looks for the ranks of the ladder it is given', () => {
    expect(rank('EMERALD 3')).toBe('Emerald 3');
    expect(rank('EMERALD 3', classic)).toBeNull();
  });
});

describe('reading the figures', () => {
  it('reads rank progress', () => {
    expect(readProgress('RANK PROGRESS: 59%')).toBe(59);
    expect(readProgress('0 RANK PROGRESS: 59%')).toBe(59);
    expect(readProgress('[rank procRess; 7 %')).toBe(7);
    expect(readProgress('RANK PROGRESS: 100%')).toBe(100);
  });

  it('is not fooled by other progress on the screen, or by a figure too large', () => {
    expect(readProgress('22/30 PROGRESS')).toBeNull();
    expect(readProgress('RANK PROGRESS: 590%')).toBeNull();
    expect(readProgress('HIGHER RANKED THAN 99% OF PLAYERS')).toBeNull();
  });

  it('reads the share of players a rank beats', () => {
    expect(readBetterThan('HIGHER RANKED THAN 99% OF PLAYERS')).toBe(99);
    expect(readBetterThan('HIGHER RANKED THAN 42.5% OF OTHER PLAYERS')).toBe(42.5);
    expect(readBetterThan('HIGHER RANKED THAN 7,25% OF PLAYERS')).toBe(7.25);
    expect(readBetterThan('H1GHER RANKED THAN 99% OF PLAYERS')).toBeNull();
    expect(readBetterThan('HIGHER RANKED THAN 100% OF PLAYERS')).toBeNull();
    expect(readBetterThan('RANK PROGRESS: 59%')).toBeNull();
  });

  it('reads a figure standing on its own', () => {
    expect(readNumber('59%')).toBe(59);
    expect(readNumber(' 99.5 %')).toBe(99.5);
    expect(readNumber('%')).toBeNull();
  });
});

describe('reading a whole screen', () => {
  // The lines the text reader finds on a rank-up screen, clutter included.
  const screen = [
    'COMPETITIVE LEADERBOARD SUMMARY REWARDS',
    'VICTORY!',
    '22/30 PROGRESS',
    'CHALLENGER SCORE',
    '3,851 ~450 +225 BONUS',
    'MAUGA SR',
    '4579',
    'CHEMPION 4',
    '0 RANK PROGRESS: 59%',
    'HIGHER RANKED THAN 99% OF PLAYERS pe',
    '(<) PRESSURE (3 CALIBRATIONUP (3) UPHILLBATTLE ( VICTORY',
  ].map(line);

  it('finds the rank, the progress and the percentage', () => {
    const found = parseRankScreen(screen, ladder);
    expect(found.rank.tier.id).toBe('champion');
    expect(found.rank.number).toBe(4);
    expect(found.progress.value).toBe(59);
    expect(found.betterThan.value).toBe(99);
  });

  it('remembers the line each was on, and the word holding each figure', () => {
    const found = parseRankScreen(screen, ladder);
    expect(found.rank.line.text).toBe('CHEMPION 4');
    expect(found.progress.word.text).toBe('59%');
    expect(found.betterThan.word.text).toBe('99%');
  });

  it('handles both figures on one line', () => {
    const found = parseRankScreen([line('RANK PROGRESS: 59% HIGHER RANKED THAN 99% OF PLAYERS')], ladder);
    expect(found.progress.value).toBe(59);
    expect(found.progress.word.text).toBe('59%');
    expect(found.betterThan.value).toBe(99);
    expect(found.betterThan.word.text).toBe('99%');
    expect(found.rank).toBeNull();
  });

  it('prefers the rank that was read most cleanly', () => {
    const found = parseRankScreen([line('MESTER 2'), line('MASTER 3')], ladder);
    expect(found.rank.number).toBe(3);
  });

  it('finds nothing on a screen without them', () => {
    expect(parseRankScreen([line('PLAY OF THE GAME'), line('12:41')], ladder)).toEqual({
      rank: null,
      progress: null,
      betterThan: null,
    });
  });
});

describe('settling on a reading', () => {
  it('takes the value most readings agree on', () => {
    expect(settle([59, 99, 99])).toEqual({ value: 99, agreed: true });
    expect(settle([99, null, 99])).toEqual({ value: 99, agreed: true });
  });

  it('takes the most trusted reading when no two agree, and says so', () => {
    expect(settle([99, 59, null])).toEqual({ value: 99, agreed: false });
    expect(settle([null, undefined, 42])).toEqual({ value: 42, agreed: false });
  });

  it('has nothing to say without a reading', () => {
    expect(settle([null, null])).toBeNull();
  });
});

describe('rank progress as SR', () => {
  it('measures the progress along the division', () => {
    expect(srAt(ladder.parseRank('Champion 4'), 59)).toBe(4659);
    expect(srAt(ladder.parseRank('Champion 4'), 0)).toBe(4600);
    expect(srAt(ladder.parseRank('Champion 1'), 100)).toBe(5000);
  });

  it('follows the width of the division, which is wider in Bronze', () => {
    expect(srAt(ladder.parseRank('Bronze 5'), 50)).toBe(100);
    expect(srAt(classic.parseRank('Bronze 1'), 50)).toBe(1350);
  });
});
