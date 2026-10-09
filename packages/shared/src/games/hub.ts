import { cadenceWindow } from "../cadence.js";
import type { GameDefinition, GameRegion } from "./types.js";

/** What the game hub's header counts down to on a server: the next daily and weekly resets and the version's end. */
export function hubResets(game: GameDefinition, region: GameRegion, now: Date) {
  const v = game.manifest.version;
  return {
    daily: cadenceWindow({ cadence: "daily" }, region, now).end,
    weekly: cadenceWindow({ cadence: "weekly" }, region, now).end,
    versionEnd: cadenceWindow({ cadence: "version", start: v.start, days: v.days }, region, now).end,
  };
}

/** "UTC+1", "UTC−5", "UTC+5:45", "UTC". */
export function utcLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC";
  const a = Math.abs(offsetMinutes);
  const m = a % 60;
  return `UTC${offsetMinutes > 0 ? "+" : "−"}${Math.floor(a / 60)}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}
