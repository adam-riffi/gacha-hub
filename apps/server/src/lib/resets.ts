import { DateTime, FixedOffsetZone } from "luxon";
import type { GameRegion, TaskCadence } from "@gacha/shared";

/**
 * The subset of a region needed to compute reset boundaries. Gacha servers use
 * FIXED UTC offsets (no daylight saving), so we anchor all math to a fixed-
 * offset zone. That makes every boundary a deterministic absolute instant,
 * independent of the machine's own timezone.
 */
export interface RegionReset {
  utcOffsetMinutes: number;
  /** Region-local hour (0-23) the daily resets at (e.g. Genshin = 4). */
  dailyResetHour: number;
  /** Weekday the weekly resets on (1=Mon .. 7=Sun, luxon convention). */
  weeklyResetWeekday: number;
}

/** Sensible fallback when a game/account has no configured region. */
export const DEFAULT_REGION: RegionReset = {
  utcOffsetMinutes: 0,
  dailyResetHour: 0,
  weeklyResetWeekday: 1,
};

export function toRegionReset(def?: Partial<GameRegion> | null): RegionReset {
  if (!def) return DEFAULT_REGION;
  return {
    utcOffsetMinutes: def.utcOffsetMinutes ?? DEFAULT_REGION.utcOffsetMinutes,
    dailyResetHour: def.dailyResetHour ?? DEFAULT_REGION.dailyResetHour,
    weeklyResetWeekday: def.weeklyResetWeekday ?? DEFAULT_REGION.weeklyResetWeekday,
  };
}

function zoneFor(region: RegionReset): FixedOffsetZone {
  return FixedOffsetZone.instance(region.utcOffsetMinutes);
}

/** Most recent daily reset at or before `now`. */
export function previousDailyReset(now: Date, region: RegionReset): Date {
  const zone = zoneFor(region);
  const dt = DateTime.fromJSDate(now, { zone });
  let boundary = dt.set({
    hour: region.dailyResetHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  if (boundary > dt) boundary = boundary.minus({ days: 1 });
  return boundary.toJSDate();
}

/** Next daily reset strictly after `now`. */
export function nextDailyReset(now: Date, region: RegionReset): Date {
  const zone = zoneFor(region);
  const prev = DateTime.fromJSDate(previousDailyReset(now, region), { zone });
  return prev.plus({ days: 1 }).toJSDate();
}

/** Most recent weekly reset at or before `now`. */
export function previousWeeklyReset(now: Date, region: RegionReset): Date {
  const zone = zoneFor(region);
  const dt = DateTime.fromJSDate(now, { zone });
  // luxon `set({ weekday })` moves within the current ISO week (Mon..Sun).
  let boundary = dt.set({
    weekday: region.weeklyResetWeekday as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    hour: region.dailyResetHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  if (boundary > dt) boundary = boundary.minus({ weeks: 1 });
  return boundary.toJSDate();
}

/** Next weekly reset strictly after `now`. */
export function nextWeeklyReset(now: Date, region: RegionReset): Date {
  const zone = zoneFor(region);
  const prev = DateTime.fromJSDate(previousWeeklyReset(now, region), { zone });
  return prev.plus({ weeks: 1 }).toJSDate();
}

export function previousReset(
  now: Date,
  region: RegionReset,
  cadence: TaskCadence,
): Date {
  return cadence === "weekly"
    ? previousWeeklyReset(now, region)
    : previousDailyReset(now, region);
}

export function nextReset(
  now: Date,
  region: RegionReset,
  cadence: TaskCadence,
): Date {
  return cadence === "weekly"
    ? nextWeeklyReset(now, region)
    : nextDailyReset(now, region);
}

/**
 * Whether a recurring task counts as done for the current cycle: it was last
 * completed at or after the most recent reset boundary.
 */
export function isDoneThisCycle(
  lastCompletedAt: Date | null | undefined,
  now: Date,
  region: RegionReset,
  cadence: TaskCadence,
): boolean {
  if (!lastCompletedAt) return false;
  return lastCompletedAt.getTime() >= previousReset(now, region, cadence).getTime();
}
