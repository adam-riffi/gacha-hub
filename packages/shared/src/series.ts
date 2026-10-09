/** Series helpers for the line, bar, segmented and heat charts (VISUAL-DESIGN.md §8). */
const f1 = (v: number) => +v.toFixed(1);

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/** A day's heat by the share of games with every daily done: none, up to a third, up to two thirds, more but not all, all. */
export function heatLevel(done: number, total: number): HeatLevel {
  if (total <= 0 || done <= 0) return 0;
  const share = done / total;
  return share <= 1 / 3 ? 1 : share <= 2 / 3 ? 2 : done < total ? 3 : 4;
}

/** Days with everything done, the best run, and the current run; the last day keeps the run alive while it is still open. */
export function streaks(full: readonly boolean[]): { full: number; best: number; current: number } {
  let count = 0;
  let best = 0;
  let run = 0;
  for (const f of full) {
    if (f) {
      count++;
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  let current = 0;
  for (let k = full.length - 1; k >= 0; k--) {
    if (k === full.length - 1 && !full[k]) continue;
    if (full[k]) current++;
    else break;
  }
  return { full: count, best, current };
}

/** Slanted segments, one per ten levels, 4 px apart: the track, and the fill up to `level`. */
export function segmentedBar(level: number, max: number, width = 140): { track: string; fill: string } {
  const n = Math.max(1, Math.ceil(max / 10));
  const gap = 4;
  const skew = 4;
  const w = (width - (n - 1) * gap) / n;
  const para = (x: number, pw: number) => `M${f1(x + skew)} 0H${f1(x + pw + skew)}L${f1(x + pw)} 8H${f1(x)}Z`;
  let track = "";
  let fill = "";
  for (let i = 0; i < n; i++) {
    const x = i * (w + gap);
    track += para(x, w);
    const fw = Math.max(0, Math.min(1, (level - i * 10) / 10)) * w;
    if (fw > 0) fill += para(x, fw);
  }
  return { track, fill };
}

export interface ChartBox {
  x0: number;
  w: number;
  y0: number;
  h: number;
}

/** Points of a line on a chart box: evenly spaced (a single point centred), values scaled from zero to `max`. */
export function linePoints(values: readonly number[], box: ChartBox, max: number): { x: number; y: number; v: number }[] {
  const n = values.length;
  return values.map((v, k) => ({
    x: f1(n > 1 ? box.x0 + (k * box.w) / (n - 1) : box.x0 + box.w / 2),
    y: f1(box.y0 + box.h * (1 - (max > 0 ? v / max : 0))),
    v,
  }));
}
