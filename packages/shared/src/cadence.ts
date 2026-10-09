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

const MIN = 60_000;
const H = 60 * MIN;
const DAY = 24 * H;

export function cadenceWindow(anchor: CadenceAnchor, clock: ServerClock, now: Date): CadenceWindow {
  const shift = clock.utcOffsetMinutes * MIN;
  const reset = clock.dailyResetHour * H;
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
      const startOf = (y: number, m: number) => {
        const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        return Date.UTC(y, m, Math.min(anchor.day, last)) / DAY;
      };
      let y = today.getUTCFullYear();
      let m = today.getUTCMonth();
      if (gameDay < startOf(y, m)) [y, m] = m === 0 ? [y - 1, 11] : [y, m - 1];
      const [ny, nm] = m === 11 ? [y + 1, 0] : [y, m + 1];
      return { start: at(startOf(y, m)), end: at(startOf(ny, nm)) };
    }
    case "cycle":
    case "version": {
      const first = Date.parse(`${anchor.start}T00:00:00Z`) / DAY;
      const k = Math.floor((gameDay - first) / anchor.days);
      return { start: at(first + k * anchor.days), end: at(first + (k + 1) * anchor.days) };
    }
  }
}

/**
 * The anchor a recurring task's window follows: daily and weekly on the
 * region's resets; monthly on its shop or monthly endgame mode, else the 1st;
 * cycle on its endgame mode; version on the game's current version.
 */
export function taskAnchor(m: GameManifest | undefined, cadence: Cadence, anchorKey?: string | null): CadenceAnchor {
  if (cadence === "daily" || cadence === "weekly") return { cadence };
  const shop = m?.monthlyShops.find((s) => s.key === anchorKey);
  const mode = m?.endgame.find((e) => e.key === anchorKey);
  if (cadence === "monthly") return shop ? { cadence, day: shop.day } : mode?.anchor.cadence === "monthly" ? mode.anchor : { cadence, day: 1 };
  if (cadence === "cycle" && mode) return mode.anchor;
  // ponytail: a cycle task whose mode left the manifest follows the version until edited.
  return m ? { cadence: "version", start: m.version.start, days: m.version.days } : { cadence: "daily" };
}
