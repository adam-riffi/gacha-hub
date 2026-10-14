/**
 * Math for the hand-written SVG charts (VISUAL-DESIGN.md §8), ported from the
 * dashboard design. Arcs run counter-clockwise from 12 o'clock; paths are
 * strings ready for a `d` attribute.
 */
const oneDecimal = (value: number) => +value.toFixed(1);

/** An arc of `percent` percent around (centerX, centerY): empty at zero, just short of a full circle at 100 so it still draws. */
export function arcPath(centerX: number, centerY: number, radius: number, percent: number): string {
  if (percent <= 0) return "";
  const clampedPercent = Math.min(percent, 99.99);
  const angle = (clampedPercent / 100) * 2 * Math.PI;
  const x = centerX - radius * Math.sin(angle);
  const y = centerY - radius * Math.cos(angle);
  return `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 ${clampedPercent > 50 ? 1 : 0} 0 ${x.toFixed(2)} ${y.toFixed(2)}`;
}

/**
 * A ring of n thin radial strips: flat and dim beyond the current value, lit up
 * to it and rising exponentially over the last few (each strip behind the status
 * strip loses a constant share of the rise, `decay` strips to shrink by e).
 */
export function ringStrips(centerX: number, centerY: number, innerRadius: number, stripCount: number, percent: number, baseHeight: number, maxHeight: number, decay: number): { lit: string; off: string } {
  const step = 360 / stripCount;
  const now = (Math.min(Math.max(percent, 0), 99.99) / 100) * 360;
  const back = Math.floor(now / step);
  let off = "";
  let lit = "";
  for (let stripIndex = -back; stripIndex < stripCount - back; stripIndex++) {
    const degrees = now + stripIndex * step;
    const on = percent > 0 && stripIndex <= 0;
    const height = on ? baseHeight + (maxHeight - baseHeight) * Math.exp(stripIndex / decay) : baseHeight;
    const angle = (degrees * Math.PI) / 180;
    const seg = `M${oneDecimal(centerX - innerRadius * Math.sin(angle))} ${oneDecimal(centerY - innerRadius * Math.cos(angle))}L${oneDecimal(centerX - (innerRadius + height) * Math.sin(angle))} ${oneDecimal(centerY - (innerRadius + height) * Math.cos(angle))}`;
    if (on) lit += seg;
    else off += seg;
  }
  return { lit, off };
}

/** The point `deg` degrees clockwise from 12 o'clock at radius r. */
export function polar(centerX: number, centerY: number, deg: number, radius: number): { x: number; y: number } {
  const angle = ((deg - 90) * Math.PI) / 180;
  return { x: oneDecimal(centerX + radius * Math.cos(angle)), y: oneDecimal(centerY + radius * Math.sin(angle)) };
}

/** A circle as a closed path, so it can share a `d` with other marks. */
export const circlePath = (x: number, y: number, radius: number): string =>
  `M${oneDecimal(x - radius)} ${oneDecimal(y)}a${radius} ${radius} 0 1 0 ${oneDecimal(2 * radius)} 0a${radius} ${radius} 0 1 0 ${oneDecimal(-2 * radius)} 0z`;

/** A rectangle as a closed path. */
export const rectPath = (x: number, y: number, width: number, height: number): string => `M${oneDecimal(x)} ${oneDecimal(y)}h${oneDecimal(width)}v${oneDecimal(height)}h${oneDecimal(-width)}z`;

/** A round axis maximum for a value: steps of 5, 10, 20 or 50, at least one step. */
export function niceMax(value: number): { step: number; max: number } {
  const step = value <= 20 ? 5 : value <= 50 ? 10 : value <= 100 ? 20 : 50;
  return { step, max: Math.max(step, Math.ceil(value / step) * step) };
}

/** Percent of done over total, rounded; zero when there is nothing to do. */
export const percent = (done: number, total: number): number => (total > 0 ? Math.round((done / total) * 100) : 0);
