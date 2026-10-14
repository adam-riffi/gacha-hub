/** Series helpers for the line, bar, segmented and heat charts (VISUAL-DESIGN.md §8). */
const oneDecimal = (value: number) => +value.toFixed(1);

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/** A day's heat by the share of games with every daily done: none, up to a third, up to two thirds, more but not all, all. */
export function heatLevel(done: number, total: number): HeatLevel {
  if (total <= 0 || done <= 0) return 0;
  const share = done / total;
  return share <= 1 / 3 ? 1 : share <= 2 / 3 ? 2 : done < total ? 3 : 4;
}

/**
 * A day's heat by its share of dailies done, summed over the games shown
 * (Georges, round 7: a game's map shows how much of its dailies was done);
 * full when every game's dailies all were.
 */
export function dayHeat(games: readonly { done: number; total: number }[]): { level: HeatLevel; full: boolean } {
  const done = games.reduce((total, gameTally) => total + Math.min(gameTally.done, gameTally.total), 0);
  const total = games.reduce((total, gameTally) => total + gameTally.total, 0);
  return { level: heatLevel(done, total), full: games.length > 0 && games.every((gameTally) => gameTally.total > 0 && gameTally.done >= gameTally.total) };
}

/** Days with everything done, the best run, and the current run; the last day keeps the run alive while it is still open. */
export function streaks(full: readonly boolean[]): { full: number; best: number; current: number } {
  let count = 0;
  let best = 0;
  let run = 0;
  for (const fullDay of full) {
    if (fullDay) {
      count++;
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  let current = 0;
  for (let dayIndex = full.length - 1; dayIndex >= 0; dayIndex--) {
    if (dayIndex === full.length - 1 && !full[dayIndex]) continue;
    if (full[dayIndex]) current++;
    else break;
  }
  return { full: count, best, current };
}

/** Slanted segments, one per ten levels, 4 px apart: the track, and the fill up to `level`. */
export function segmentedBar(level: number, max: number, width = 140): { track: string; fill: string } {
  const segmentCount = Math.max(1, Math.ceil(max / 10));
  const gap = 4;
  const skew = 4;
  const segmentWidth = (width - (segmentCount - 1) * gap) / segmentCount;
  const para = (x: number, partWidth: number) => `M${oneDecimal(x + skew)} 0H${oneDecimal(x + partWidth + skew)}L${oneDecimal(x + partWidth)} 8H${oneDecimal(x)}Z`;
  let track = "";
  let fill = "";
  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
    const x = segmentIndex * (segmentWidth + gap);
    track += para(x, segmentWidth);
    const filledWidth = Math.max(0, Math.min(1, (level - segmentIndex * 10) / 10)) * segmentWidth;
    if (filledWidth > 0) fill += para(x, filledWidth);
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
  const valueCount = values.length;
  return values.map((value, valueIndex) => ({
    x: oneDecimal(valueCount > 1 ? box.x0 + (valueIndex * box.w) / (valueCount - 1) : box.x0 + box.w / 2),
    y: oneDecimal(box.y0 + box.h * (1 - (max > 0 ? value / max : 0))),
    v: value,
  }));
}

/** A value per date from day records (sorted by day): the latest record on or before each date, 0 before the first. */
export function carryForward(records: readonly { day: string; value: number }[], dates: readonly string[]): number[] {
  return dates.map((date) => latest(records, date) ?? 0);
}

/** What each date added over the date before: increases only, and nothing on a profile's first record. */
export function dailyGains(records: readonly { day: string; value: number }[], dates: readonly string[]): number[] {
  return dates.map((date) => {
    const before = latest(records, new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10));
    return before === undefined ? 0 : Math.max(0, (latest(records, date) ?? before) - before);
  });
}

function latest(records: readonly { day: string; value: number }[], date: string): number | undefined {
  for (let recordIndex = records.length - 1; recordIndex >= 0; recordIndex--) if (records[recordIndex]!.day <= date) return records[recordIndex]!.value;
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
  for (const day of days) {
    if (day.day === date) return { dailiesDone: day.dailiesDone, dailiesTotal: day.dailiesTotal, goalsOpen: day.goalsOpen, pulls: day.pulls };
    if (day.day < date) prev = day;
  }
  return { dailiesDone: 0, dailiesTotal: prev?.dailiesTotal ?? 0, goalsOpen: prev?.goalsOpen ?? 0, pulls: prev?.pulls ?? 0 };
}
