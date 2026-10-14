import { cadenceWindow } from "../cadence.js";
import type { GameDefinition, GameRegion } from "./types.js";

/** What the game hub's header counts down to on a server: the next daily and weekly resets and the version's end. */
export function hubResets(game: GameDefinition, region: GameRegion, now: Date) {
  const version = game.manifest.version;
  return {
    daily: cadenceWindow({ cadence: "daily" }, region, now).end,
    weekly: cadenceWindow({ cadence: "weekly" }, region, now).end,
    versionEnd: cadenceWindow({ cadence: "version", start: version.start, days: version.days }, region, now).end,
  };
}

/**
 * The version an instant falls in, counted from the current one by its
 * length ("7.1" → "7.0", "7.2"); null before the major version's first, as
 * the last minor of the one before is not known.
 */
export function versionAt(game: GameDefinition, region: GameRegion, at: Date): string | null {
  const version = game.manifest.version;
  const versionMatch = /^(\d+)\.(\d+)$/.exec(version.name);
  if (!versionMatch) return null;
  const anchor = { cadence: "version", start: version.start, days: version.days } as const;
  const current = cadenceWindow(anchor, region, new Date(`${version.start}T12:00:00Z`)).start.getTime();
  const versionsAhead = Math.round((cadenceWindow(anchor, region, at).start.getTime() - current) / (version.days * 86_400_000));
  const minor = Number(versionMatch[2]) + versionsAhead;
  return minor >= 0 ? `${versionMatch[1]}.${minor}` : null;
}

/** The premium currency rewards are paid in: the one a pull costs more than one of (Primogems, Stellar Jade…). */
export function premiumCurrency(game: GameDefinition): string {
  return game.currencies.find((currency) => (currency.pullCost ?? 0) > 1)?.label ?? "Premium";
}

/** "UTC+1", "UTC−5", "UTC+5:45", "UTC". */
export function utcLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const minutes = absoluteMinutes % 60;
  return `UTC${offsetMinutes > 0 ? "+" : "−"}${Math.floor(absoluteMinutes / 60)}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}
