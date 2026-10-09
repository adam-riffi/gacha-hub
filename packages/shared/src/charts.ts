/**
 * Math for the hand-written SVG charts (VISUAL-DESIGN.md §8), ported from the
 * dashboard design. Arcs run counter-clockwise from 12 o'clock; paths are
 * strings ready for a `d` attribute.
 */
const f1 = (v: number) => +v.toFixed(1);

/** An arc of `pct` percent around (cx, cy): empty at zero, just short of a full circle at 100 so it still draws. */
export function arcPath(cx: number, cy: number, r: number, pct: number): string {
  if (pct <= 0) return "";
  const p = Math.min(pct, 99.99);
  const a = (p / 100) * 2 * Math.PI;
  const x = cx - r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${p > 50 ? 1 : 0} 0 ${x.toFixed(2)} ${y.toFixed(2)}`;
}

/**
 * A ring of n thin radial strips: flat and dim beyond the current value, lit up
 * to it and rising exponentially over the last few (each strip behind the status
 * strip loses a constant share of the rise, `tau` strips to shrink by e).
 */
export function ringStrips(cx: number, cy: number, r0: number, n: number, pct: number, hBase: number, hMax: number, tau: number): { lit: string; off: string } {
  const step = 360 / n;
  const now = (Math.min(Math.max(pct, 0), 99.99) / 100) * 360;
  const back = Math.floor(now / step);
  let off = "";
  let lit = "";
  for (let j = -back; j < n - back; j++) {
    const deg = now + j * step;
    const on = pct > 0 && j <= 0;
    const h = on ? hBase + (hMax - hBase) * Math.exp(j / tau) : hBase;
    const a = (deg * Math.PI) / 180;
    const seg = `M${f1(cx - r0 * Math.sin(a))} ${f1(cy - r0 * Math.cos(a))}L${f1(cx - (r0 + h) * Math.sin(a))} ${f1(cy - (r0 + h) * Math.cos(a))}`;
    if (on) lit += seg;
    else off += seg;
  }
  return { lit, off };
}

/** The point `deg` degrees clockwise from 12 o'clock at radius r. */
export function polar(cx: number, cy: number, deg: number, r: number): { x: number; y: number } {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: f1(cx + r * Math.cos(a)), y: f1(cy + r * Math.sin(a)) };
}

/** A circle as a closed path, so it can share a `d` with other marks. */
export const circlePath = (x: number, y: number, r: number): string =>
  `M${f1(x - r)} ${f1(y)}a${r} ${r} 0 1 0 ${f1(2 * r)} 0a${r} ${r} 0 1 0 ${f1(-2 * r)} 0z`;

/** A rectangle as a closed path. */
export const rectPath = (x: number, y: number, w: number, h: number): string => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;

/** A round axis maximum for a value: steps of 5, 10, 20 or 50, at least one step. */
export function niceMax(value: number): { step: number; max: number } {
  const step = value <= 20 ? 5 : value <= 50 ? 10 : value <= 100 ? 20 : 50;
  return { step, max: Math.max(step, Math.ceil(value / step) * step) };
}

/** Percent of done over total, rounded; zero when there is nothing to do. */
export const percent = (done: number, total: number): number => (total > 0 ? Math.round((done / total) * 100) : 0);
