import { z } from "zod";
import { cadenceWindow, type ServerClock } from "./cadence.js";
import type { GameDefinition } from "./games/types.js";

const DAY = 86_400_000;

/** A stored endgame result: one mode's cycle (by its window's start). */
export const cycleResultDto = z.object({
  modeKey: z.string(),
  cycleStart: z.string(),
  result: z.number().int().nullable(),
  detail: z.string().nullable(),
  premium: z.number().int().nullable(),
  source: z.string(),
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
    const w = cadenceWindow(mode.anchor, region, now);
    const closes = mode.openDays ? new Date(w.start.getTime() + mode.openDays * DAY) : w.end;
    const r = results.find((x) => x.modeKey === mode.key && x.cycleStart.getTime() === w.start.getTime());
    return { mode, start: w.start, end: w.end, closes, open: closes > now, result: r?.result ?? null, premium: r?.premium ?? 0 };
  });
  const open = modes.filter((m) => m.open);
  const next = [...open].sort((a, b) => a.closes.getTime() - b.closes.getTime())[0];
  return {
    modes,
    claimed: open.reduce((s, m) => s + m.premium, 0),
    max: open.reduce((s, m) => s + (m.mode.maxPremium ?? 0), 0),
    next: next ? { ...next, unclaimed: Math.max(0, (next.mode.maxPremium ?? 0) - next.premium) } : null,
  };
}
