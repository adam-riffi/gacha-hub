import { cadenceWindow, type GameRegion, type TaskCadence } from "@gacha/shared";

/**
 * The subset of a region needed to compute reset boundaries. Gacha servers use
 * fixed UTC offsets (no daylight saving); the windows come from the shared
 * cadence core (packages/shared/src/cadence.ts), so every boundary is a
 * deterministic instant, independent of the machine's own time zone.
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

/** Most recent daily reset at or before `now`. */
export const previousDailyReset = (now: Date, region: RegionReset): Date => cadenceWindow({ cadence: "daily" }, region, now).start;

/** Next daily reset strictly after `now`. */
export const nextDailyReset = (now: Date, region: RegionReset): Date => cadenceWindow({ cadence: "daily" }, region, now).end;

/** Most recent weekly reset at or before `now`. */
export const previousWeeklyReset = (now: Date, region: RegionReset): Date => cadenceWindow({ cadence: "weekly" }, region, now).start;

/** Next weekly reset strictly after `now`. */
export const nextWeeklyReset = (now: Date, region: RegionReset): Date => cadenceWindow({ cadence: "weekly" }, region, now).end;

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
