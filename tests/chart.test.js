import { describe, expect, it } from 'vitest';
import { LADDER_CONFIG } from '../src/data/ladder.js';
import { createTierRamp } from '../src/lib/chart/tierRamp.js';
import { fromOklab, lighten, parseHex, saturate, toOklab } from '../src/lib/color.js';
import { createLadder } from '../src/lib/ladder/createLadder.js';

const ladder = createLadder(LADDER_CONFIG);
const tier = (id) => ladder.tiers.find((candidate) => candidate.id === id);

/** How far apart two colours are, as the largest difference in any channel. */
const distance = (a, b) => Math.max(...a.map((value, i) => Math.abs(value - b[i])));

describe('colour helpers', () => {
  it('converts to OKLab and back without drifting', () => {
    for (const { color } of ladder.tiers) {
      expect(fromOklab(toOklab(parseHex(color)))).toEqual(parseHex(color));
    }
  });

  it('lightens towards white and darkens towards black', () => {
    const gold = parseHex(tier('gold').color);
    expect(lighten(gold, 1)).toEqual([255, 255, 255]);
    expect(lighten(gold, -1)).toEqual([0, 0, 0]);
    expect(lighten(gold, 0)).toEqual(gold);
  });

  it('removes all colour at zero saturation', () => {
    const [r, g, b] = saturate(parseHex(tier('emerald').color), 0);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(1);
  });
});

describe('tier ramp', () => {
  const ramp = createTierRamp(ladder);

  it("gives each tier its own colour through its middle", () => {
    for (const { midSr, color } of ladder.tiers) {
      expect(ramp.colorAt(midSr)).toEqual(parseHex(color));
    }
  });

  it('never jumps: the colour is the same just either side of a boundary', () => {
    for (const { minSr } of ladder.tiers.slice(1)) {
      expect(distance(ramp.colorAt(minSr - 1), ramp.colorAt(minSr + 1))).toBeLessThanOrEqual(3);
    }
  });

  it('covers the whole axis with stops, in order', () => {
    for (const stops of [ramp.stops, ramp.softStops]) {
      expect(stops[0].offset).toBe(0);
      expect(stops.at(-1).offset).toBe(1);
      expect(stops.every((stop, i) => i === 0 || stop.offset > stops[i - 1].offset)).toBe(true);
    }
  });

  it('bleeds neighbouring tiers into each other in the soft ramp', () => {
    // In the middle of Gold the soft ramp has taken on some of Silver and Platinum; the sharp one has not.
    const { midSr, color } = tier('gold');
    const at = (stops) => stops.find((stop) => stop.offset === midSr / ladder.maxSr).color;
    expect(at(ramp.stops)).toEqual(parseHex(color));
    expect(distance(at(ramp.softStops), parseHex(color))).toBeGreaterThan(8);
  });
});
