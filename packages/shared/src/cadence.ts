/**
 * Cadence windows (ADR 0004): when an activity's current period started and
 * when it ends, for the five cadences a game runs on. Game servers keep a fixed
 * UTC offset with no daylight saving, so every boundary is plain arithmetic on
 * the server's wall clock: the viewer's time zone never enters into it.
 */
import type { GameManifest } from "./games/types.js";

export type Cadence = "daily" | "weekly" | "monthly" | "cycle" | "version";

/** A server region's clock: its fixed offset, daily reset hour and weekly reset weekday (1 = Mon … 7 = Sun). */
export interface ServerClock {
  utcOffsetMinutes: number;
  dailyResetHour: number;
  weeklyResetWeekday: number;
}

/**
 * How a cadence repeats. Weekly defaults to the region's weekly reset; monthly
 * starts on `day` (or the month's last day when shorter); cycles and versions
 * repeat every `days` from `start`, a server-local date. Every window starts at
 * the region's daily reset hour.
 */
export type CadenceAnchor =
  | { cadence: "daily" }
  | { cadence: "weekly"; weekday?: number }
  | { cadence: "monthly"; day: number }
  | { cadence: "cycle" | "version"; start: string; days: number };

export interface CadenceWindow {
  start: Date;
  end: Date;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY = 24 * HOUR_MS;

export function cadenceWindow(anchor: CadenceAnchor, clock: ServerClock, now: Date): CadenceWindow {
  const shift = clock.utcOffsetMinutes * MINUTE_MS;
  const reset = clock.dailyResetHour * HOUR_MS;
  // Days since the epoch on the server's "game day", which turns at the reset hour.
  const gameDay = Math.floor((now.getTime() + shift - reset) / DAY);
  const at = (day: number) => new Date(day * DAY + reset - shift);

  switch (anchor.cadence) {
    case "daily":
      return { start: at(gameDay), end: at(gameDay + 1) };
    case "weekly": {
      const weekday = ((gameDay + 3) % 7) + 1; // 1970-01-01 was a Thursday
      const back = (weekday - (anchor.weekday ?? clock.weeklyResetWeekday) + 7) % 7;
      return { start: at(gameDay - back), end: at(gameDay - back + 7) };
    }
    case "monthly": {
      const today = new Date(gameDay * DAY);
      const startOf = (year: number, month: number) => {
        const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        return Date.UTC(year, month, Math.min(anchor.day, last)) / DAY;
      };
      let year = today.getUTCFullYear();
      let month = today.getUTCMonth();
      if (gameDay < startOf(year, month)) [year, month] = month === 0 ? [year - 1, 11] : [year, month - 1];
      const [nextYear, nextMonth] = month === 11 ? [year + 1, 0] : [year, month + 1];
      return { start: at(startOf(year, month)), end: at(startOf(nextYear, nextMonth)) };
    }
    case "cycle":
    case "version": {
      const first = Date.parse(`${anchor.start}T00:00:00Z`) / DAY;
      const cycleIndex = Math.floor((gameDay - first) / anchor.days);
      return { start: at(first + cycleIndex * anchor.days), end: at(first + (cycleIndex + 1) * anchor.days) };
    }
  }
}

/** The server's game day (YYYY-MM-DD): the date its current daily window started on, in server time. */
export function gameDay(clock: ServerClock, now: Date): string {
  const start = cadenceWindow({ cadence: "daily" }, clock, now).start;
  return new Date(start.getTime() + clock.utcOffsetMinutes * MINUTE_MS).toISOString().slice(0, 10);
}

/**
 * The anchor a recurring task's window follows: daily and weekly on the
 * region's resets; monthly on its shop or monthly endgame mode, else the 1st;
 * cycle on its endgame mode; version on the game's current version.
 */
export function taskAnchor(manifest: GameManifest | undefined, cadence: Cadence, anchorKey?: string | null): CadenceAnchor {
  if (cadence === "daily" || cadence === "weekly") return { cadence };
  const shop = manifest?.monthlyShops.find((shop) => shop.key === anchorKey);
  const mode = manifest?.endgame.find((endgameMode) => endgameMode.key === anchorKey);
  if (cadence === "monthly") return shop ? { cadence, day: shop.day } : mode?.anchor.cadence === "monthly" ? mode.anchor : { cadence, day: 1 };
  if (cadence === "cycle" && mode) return mode.anchor;
  // ponytail: a cycle task whose mode left the manifest follows the version until edited.
  return manifest ? { cadence: "version", start: manifest.version.start, days: manifest.version.days } : { cadence: "daily" };
}
