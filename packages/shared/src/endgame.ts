import { z } from "zod";
import { cadenceWindow, type ServerClock } from "./cadence.js";
import type { GameDefinition } from "./games/types.js";
import { catalogIdSchema } from "./dto/common.js";

const DAY = 86_400_000;

/** One stage of a cycle: the team that cleared it (character catalog ids) and its clear time in seconds. */
export const clearSchema = z.object({
  stage: z.string().trim().min(1).max(40),
  members: z.array(catalogIdSchema).max(8),
  time: z.number().int().min(1).max(3600).nullable(),
  /** The stage's score where the mode scores each (Deadly Assault's points, a frontier's rank), round 7. */
  score: z.number().int().min(0).max(1_000_000).nullable().optional(),
});
export type Clear = z.infer<typeof clearSchema>;

/** A stored endgame result: one mode's cycle (by its window's start). */
export const cycleResultDto = z.object({
  modeKey: z.string(),
  cycleStart: z.string(),
  result: z.number().int().nullable(),
  detail: z.string().nullable(),
  premium: z.number().int().nullable(),
  source: z.string(),
  teams: z.array(clearSchema).default([]),
});
export const cycleResultsDto = z.object({ results: z.array(cycleResultDto) });
export type CycleResultsDto = z.infer<typeof cycleResultsDto>;

/** A result typed for the cycle a server-local day falls in; each mode's own best and offer apply on top. */
export const cycleResultInput = z.object({
  modeKey: z.string().regex(/^[A-Za-z0-9-]{1,64}$/),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  result: z.number().int().min(0).max(100_000).nullable(),
  premium: z.number().int().min(0).max(100_000).nullable().optional(),
  detail: z.string().trim().max(80).nullable().optional(),
  /** Each stage's team and clear time; left out, the stored ones stay. */
  teams: z.array(clearSchema).max(12).optional(),
});

/** An instant inside a server-local game day (an hour after its reset). */
export function dayInstant(day: string, region: ServerClock): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) + (region.dailyResetHour + 1) * 3_600_000 - region.utcOffsetMinutes * 60_000);
}

export interface CycleResultLike {
  modeKey: string;
  cycleStart: Date;
  result: number | null;
  premium: number | null;
}

/**
 * Each endgame mode's current cycle with its result, and the premium claimed
 * across the open cycles against what they offer (WIREFRAMES.md G2 "This
 * cycle"); the next to close, with what is still unclaimed in it.
 */
export function endgameNow(game: GameDefinition, region: ServerClock, now: Date, results: readonly CycleResultLike[]) {
  const modes = game.manifest.endgame.map((mode) => {
    const cycleWindow = cadenceWindow(mode.anchor, region, now);
    const closes = mode.openDays ? new Date(cycleWindow.start.getTime() + mode.openDays * DAY) : cycleWindow.end;
    const result = results.find((candidate) => candidate.modeKey === mode.key && candidate.cycleStart.getTime() === cycleWindow.start.getTime());
    return { mode, start: cycleWindow.start, end: cycleWindow.end, closes, open: closes > now, result: result?.result ?? null, premium: result?.premium ?? 0 };
  });
  const open = modes.filter((modeView) => modeView.open);
  const next = [...open].sort((first, second) => first.closes.getTime() - second.closes.getTime())[0];
  return {
    modes,
    claimed: open.reduce((total, modeView) => total + modeView.premium, 0),
    max: open.reduce((total, modeView) => total + (modeView.mode.maxPremium ?? 0), 0),
    next: next ? { ...next, unclaimed: Math.max(0, (next.mode.maxPremium ?? 0) - next.premium) } : null,
  };
}

type Mode = GameDefinition["manifest"]["endgame"][number];
export interface CycleRow extends CycleResultLike {
  detail: string | null;
  source: string;
  teams?: Clear[];
}

/** A server-local date of an instant (YYYY-MM-DD). */
const localDate = (instant: Date, region: ServerClock) => new Date(instant.getTime() + region.utcOffsetMinutes * 60_000).toISOString().slice(0, 10);

/**
 * One mode's history (WIREFRAMES.md G2): its cycles newest first, each with
 * its end, whether it is the current one and a full clear; the best result
 * and how often, the average of completed cycles, and the premium earned of
 * what those cycles offered.
 */
export function cycleHistory(mode: Mode, region: ServerClock, now: Date, results: readonly CycleRow[]) {
  const current = cadenceWindow(mode.anchor, region, now).start.getTime();
  const rows = results
    .filter((result) => result.modeKey === mode.key)
    .sort((first, second) => second.cycleStart.getTime() - first.cycleStart.getTime())
    .map((result) => ({
      ...result,
      end: cadenceWindow(mode.anchor, region, result.cycleStart).end,
      current: result.cycleStart.getTime() === current,
      full: mode.metric.max !== undefined && result.result === mode.metric.max,
    }));
  const scored = rows.filter((row) => row.result !== null);
  const completed = scored.filter((row) => !row.current);
  const best = scored.length ? Math.max(...scored.map((row) => row.result!)) : null;
  const bests = scored.filter((row) => row.result === best);
  return {
    rows,
    best,
    bestTimes: bests.length,
    bestLast: bests[0]?.cycleStart ?? null,
    average: completed.length ? completed.reduce((total, row) => total + row.result!, 0) / completed.length : null,
    completed: completed.length,
    earned: rows.reduce((total, row) => total + (row.premium ?? 0), 0),
    offered: (mode.maxPremium ?? 0) * rows.length,
  };
}

/** A mode's cycles newest first: the ones on record, and the current one, empty, before anything is typed in it. */
export function modeCycles(mode: Mode, region: ServerClock, now: Date, results: readonly CycleRow[]) {
  const rows = cycleHistory(mode, region, now, results).rows;
  if (rows.some((row) => row.current)) return rows;
  const cycleWindow = cadenceWindow(mode.anchor, region, now);
  return [{ modeKey: mode.key, cycleStart: cycleWindow.start, end: cycleWindow.end, current: true, full: false, result: null, premium: null, detail: null, source: "manual", teams: [] as Clear[] }, ...rows];
}

/** The history as CSV: first and last server-local day of each cycle, its result, detail, premium and source. */
export function cycleCsv(mode: Mode, region: ServerClock, rows: ReturnType<typeof cycleHistory>["rows"], premium: string): string {
  const cell = (value: string | number | null) => {
    const text = value === null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = rows.map((row) =>
    [localDate(row.cycleStart, region), localDate(new Date(row.end.getTime() - 86_400_000), region), row.result, row.detail, row.premium, row.source].map(cell).join(","),
  );
  return [["first day", "last day", mode.metric.label, "detail", premium, "source"].map(cell).join(","), ...lines].join("\n");
}
