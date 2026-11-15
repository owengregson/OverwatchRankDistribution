/**
 * Colour helpers. Colours are mixed in OKLab, a space built so that equal
 * steps look equally different: a blend between two hues stays bright and
 * clean in the middle, where blending the raw RGB numbers goes muddy.
 *
 * A colour here is [r, g, b] with each channel 0–255; an OKLab colour is
 * [L, a, b].
 */

/** "#rrggbb" → [r, g, b]. */
export function parseHex(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const toLinear = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (c) => {
  const gamma = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, gamma)) * 255);
};

export function toOklab([red, green, blue]) {
  const r = toLinear(red);
  const g = toLinear(green);
  const b = toLinear(blue);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Blend two OKLab colours: t = 0 gives `from`, 1 gives `to`. */
export const mixOklab = (from, to, t) => from.map((value, i) => value + (to[i] - value) * t);

const WHITE = toOklab([255, 255, 255]);
const BLACK = toOklab([0, 0, 0]);

/** A colour moved towards white (amount above 0, 1 is white) or towards black (below 0, -1 is black). */
export const lighten = (color, amount) =>
  fromOklab(mixOklab(toOklab(color), amount < 0 ? BLACK : WHITE, Math.abs(amount)));

/** A colour made more (above 1) or less (below 1) saturated, keeping its lightness and hue. */
export function saturate(color, amount) {
  const [L, a, b] = toOklab(color);
  return fromOklab([L, a * amount, b * amount]);
}

/** CSS for a colour, optionally see-through. */
export const css = ([r, g, b], alpha = 1) => `rgb(${r} ${g} ${b} / ${alpha})`;
