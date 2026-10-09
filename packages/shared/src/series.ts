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

/** A value per date from day records (sorted by day): the latest record on or before each date, 0 before the first. */
export function carryForward(records: readonly { day: string; value: number }[], dates: readonly string[]): number[] {
  return dates.map((d) => latest(records, d) ?? 0);
}

/** What each date added over the date before: increases only, and nothing on a profile's first record. */
export function dailyGains(records: readonly { day: string; value: number }[], dates: readonly string[]): number[] {
  return dates.map((d) => {
    const before = latest(records, new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10));
    return before === undefined ? 0 : Math.max(0, (latest(records, d) ?? before) - before);
  });
}

function latest(records: readonly { day: string; value: number }[], date: string): number | undefined {
  for (let k = records.length - 1; k >= 0; k--) if (records[k]!.day <= date) return records[k]!.value;
  return undefined;
}

/** One game's tallies on one game day (a DayRecord without its keys). */
export interface DayTally {
  day: string;
  dailiesDone: number;
  dailiesTotal: number;
  goalsOpen: number;
  pulls: number;
}

/** A game's day from its records (sorted by day): as recorded, or on a day without a change, nothing done and the rest carried from before. */
export function dayOf(days: readonly DayTally[], date: string): Omit<DayTally, "day"> {
  let prev: DayTally | undefined;
  for (const d of days) {
    if (d.day === date) return { dailiesDone: d.dailiesDone, dailiesTotal: d.dailiesTotal, goalsOpen: d.goalsOpen, pulls: d.pulls };
    if (d.day < date) prev = d;
  }
  return { dailiesDone: 0, dailiesTotal: prev?.dailiesTotal ?? 0, goalsOpen: prev?.goalsOpen ?? 0, pulls: prev?.pulls ?? 0 };
}
