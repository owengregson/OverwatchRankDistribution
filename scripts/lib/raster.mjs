/**
 * A tiny dependency-free 2D rasteriser for the image scripts: an RGBA
 * canvas, anti-aliased polygon fills (non-zero winding), an SVG path parser
 * (M L H V C Q A Z, absolute and relative) and TrueType text through
 * ./ttf.mjs. Enough to draw the social preview and app icons in Node.
 */

/** '#rrggbb' → [r, g, b] (0–255). */
export const hex = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));

export function createCanvas(width, height) {
  // Straight (non-premultiplied) float RGB plus coverage alpha, composited with "source over".
  const rgb = new Float32Array(width * height * 3);
  const alpha = new Float32Array(width * height);

  /** Blends `color` into one pixel with opacity `a` (0–1). */
  function blend(x, y, [r, g, b], a) {
    if (a <= 0 || x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    const out = a + alpha[i] * (1 - a);
    if (out <= 0) return;
    const keep = (alpha[i] * (1 - a)) / out;
    const add = a / out;
    rgb[i * 3] = rgb[i * 3] * keep + r * add;
    rgb[i * 3 + 1] = rgb[i * 3 + 1] * keep + g * add;
    rgb[i * 3 + 2] = rgb[i * 3 + 2] * keep + b * add;
    alpha[i] = out;
  }

  /**
   * Fills polygons (arrays of [x, y] points, implicitly closed) with
   * non-zero winding and exact horizontal coverage on 5 sub-scanlines a pixel.
   * `paint(x, y)` may return a colour per pixel instead of a fixed `color`.
   */
  function fill(polygons, color, opacity = 1, paint = null) {
    const edges = [];
    for (const poly of polygons) {
      for (let i = 0; i < poly.length; i++) {
        const [x0, y0] = poly[i];
        const [x1, y1] = poly[(i + 1) % poly.length];
        if (y0 === y1) continue;
        edges.push(y0 < y1 ? { x0, y0, x1, y1, dir: 1 } : { x0: x1, y0: y1, x1: x0, y1: y0, dir: -1 });
      }
    }
    if (!edges.length) return;
    const top = Math.max(0, Math.floor(Math.min(...edges.map((e) => e.y0))));
    const bottom = Math.min(height - 1, Math.ceil(Math.max(...edges.map((e) => e.y1))));
    const SUB = 5;
    const cover = new Float32Array(width + 2);

    for (let y = top; y <= bottom; y++) {
      cover.fill(0);
      let minX = width;
      let maxX = -1;
      const rowEdges = edges.filter((e) => e.y1 > y && e.y0 < y + 1);
      for (let s = 0; s < SUB; s++) {
        const sy = y + (s + 0.5) / SUB;
        const hits = [];
        for (const e of rowEdges) {
          if (sy < e.y0 || sy >= e.y1) continue;
          hits.push({ x: e.x0 + ((sy - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0), dir: e.dir });
        }
        hits.sort((a, b) => a.x - b.x);
        let winding = 0;
        for (let h = 0; h < hits.length - 1; h++) {
          winding += hits[h].dir;
          if (winding === 0) continue;
          const xa = Math.max(0, hits[h].x);
          const xb = Math.min(width, hits[h + 1].x);
          if (xb <= xa) continue;
          const ia = Math.floor(xa);
          const ib = Math.min(width - 1, Math.floor(xb));
          minX = Math.min(minX, ia);
          maxX = Math.max(maxX, ib);
          if (ia === ib) {
            cover[ia] += (xb - xa) / SUB;
          } else {
            cover[ia] += (ia + 1 - xa) / SUB;
            for (let x = ia + 1; x < ib; x++) cover[x] += 1 / SUB;
            cover[ib] += (xb - ib) / SUB;
          }
        }
      }
      for (let x = minX; x <= maxX; x++) {
        const c = Math.min(1, cover[x]);
        if (c > 0) blend(x, y, paint ? paint(x, y) : color, c * opacity);
      }
    }
  }

  /** Fills every pixel through `paint(x, y)` → [r, g, b]. */
  function shade(paint) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) blend(x, y, paint(x, y), 1);
    }
  }

  /** Straight-alpha RGBA bytes for ./png.mjs. */
  function pixels() {
    const out = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      out[i * 4] = Math.round(rgb[i * 3]);
      out[i * 4 + 1] = Math.round(rgb[i * 3 + 1]);
      out[i * 4 + 2] = Math.round(rgb[i * 3 + 2]);
      out[i * 4 + 3] = Math.round(alpha[i] * 255);
    }
    return out;
  }

  return { width, height, blend, fill, shade, pixels };
}

/** Points along a quadratic Bézier, excluding the start point. */
export function quadratic([x0, y0], [cx, cy], [x1, y1], steps = 12) {
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]);
  }
  return out;
}

function cubic([x0, y0], [ax, ay], [bx, by], [x1, y1], steps = 16) {
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([
      u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x1,
      u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y1,
    ]);
  }
  return out;
}

/** SVG elliptical arc (endpoint form) as points, excluding the start point. */
function arc([x0, y0], rx, ry, rotation, largeArc, sweep, [x1, y1]) {
  if (rx === 0 || ry === 0) return [[x1, y1]];
  const phi = (rotation * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x0 - x1) / 2;
  const dy = (y0 - y1) / 2;
  const px = cos * dx + sin * dy;
  const py = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const scale = (px * px) / (rx * rx) + (py * py) / (ry * ry);
  if (scale > 1) {
    rx *= Math.sqrt(scale);
    ry *= Math.sqrt(scale);
  }
  const num = rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px;
  const den = rx * rx * py * py + ry * ry * px * px;
  const factor = (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (factor * rx * py) / ry;
  const cyp = (-factor * ry * px) / rx;
  const cx = cos * cxp - sin * cyp + (x0 + x1) / 2;
  const cy = sin * cxp + cos * cyp + (y0 + y1) / 2;
  const angle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const start = angle(1, 0, (px - cxp) / rx, (py - cyp) / ry);
  let delta = angle((px - cxp) / rx, (py - cyp) / ry, (-px - cxp) / rx, (-py - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const steps = Math.max(8, Math.ceil(Math.abs(delta) / (Math.PI / 32)));
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const t = start + (delta * i) / steps;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    out.push([cos * ex - sin * ey + cx, sin * ex + cos * ey + cy]);
  }
  return out;
}

/** Parses SVG path data into polygons (one per subpath). */
export function parsePath(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g);
  const polygons = [];
  let poly = null;
  let cur = [0, 0];
  let start = [0, 0];
  let command = null;
  let i = 0;
  const num = () => Number(tokens[i++]);
  const flag = () => {
    // Arc flags may be packed without separators ("0 0 1" or "011").
    const token = tokens[i];
    if (token.length > 1 && /^[01]/.test(token)) {
      tokens[i] = token.slice(1);
      return Number(token[0]);
    }
    i++;
    return Number(token);
  };

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++];
    const rel = command === command.toLowerCase();
    const base = rel ? cur : [0, 0];
    const pt = () => {
      const x = num();
      const y = num();
      return [base[0] + x, base[1] + y];
    };
    switch (command.toUpperCase()) {
      case 'M': {
        cur = pt();
        start = cur;
        poly = [cur];
        polygons.push(poly);
        command = rel ? 'l' : 'L'; // further pairs are line-tos
        break;
      }
      case 'L':
        cur = pt();
        poly.push(cur);
        break;
      case 'H':
        cur = [(rel ? cur[0] : 0) + num(), cur[1]];
        poly.push(cur);
        break;
      case 'V':
        cur = [cur[0], (rel ? cur[1] : 0) + num()];
        poly.push(cur);
        break;
      case 'C': {
        const a = pt();
        const b = pt();
        const end = pt();
        poly.push(...cubic(cur, a, b, end));
        cur = end;
        break;
      }
      case 'Q': {
        const c = pt();
        const end = pt();
        poly.push(...quadratic(cur, c, end));
        cur = end;
        break;
      }
      case 'A': {
        const rx = num();
        const ry = num();
        const rotation = num();
        const large = flag();
        const sweep = flag();
        const end = pt();
        poly.push(...arc(cur, rx, ry, rotation, large, sweep, end));
        cur = end;
        break;
      }
      case 'Z':
        cur = start;
        break;
      default:
        throw new Error(`Unsupported path command ${command}`);
    }
  }
  return polygons;
}

/** Applies x' = x * scale + dx, y' = y * scale + dy to polygons. */
export const place = (polygons, scale, dx, dy) =>
  polygons.map((poly) => poly.map(([x, y]) => [x * scale + dx, y * scale + dy]));

/** The site's logo (light fill, for dark backgrounds), viewBox "0 1 48 48". */
export const LOGO = {
  viewBox: [0, 1, 48, 48],
  paths: [
    { fill: '#ed6516', d: 'M13.9 14.87a14.284 14.284 0 0 1 20.2 0l4.043-4.042a20 20 0 0 0-28.286 0z' },
    {
      fill: '#ffffff',
      d: 'm39.312 12.104-4.063 4.062a14.29 14.29 0 0 1 .995 16.159l-7.353-7.355-4.006-9.413h-.02V28.28l7.938 7.938a14.29 14.29 0 0 1-17.606 0l7.939-7.938V15.605l-4.027 9.365-7.355 7.355a14.29 14.29 0 0 1 .997-16.159l-4.063-4.062a20.001 20.001 0 1 0 30.624 0',
    },
  ],
};

/** Draws the logo with its top-left corner at (x, y), `size` pixels square. */
export function drawLogo(canvas, x, y, size) {
  const [vx, vy, vw] = LOGO.viewBox;
  const scale = size / vw;
  for (const { fill, d } of LOGO.paths) {
    canvas.fill(place(parsePath(d), scale, x - vx * scale, y - vy * scale), hex(fill));
  }
}
