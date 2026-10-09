import { z } from "zod";
import { cadenceWindow } from "./cadence.js";
import type { GameDefinition, GameRegion } from "./games/types.js";

const DAY = 86_400_000;

/** A profile's passes as stored: the battle pass typed last, the 30-day pass's end. */
export const passesDto = z.object({
  battle: z.object({ level: z.number().int(), weeklyXp: z.number().int(), updatedAt: z.string() }).nullable(),
  monthly: z.object({ endsAt: z.string() }).nullable(),
});
export type PassesDto = z.infer<typeof passesDto>;

/** Hard ceilings; each game's own level cap, XP cap and stacking limit apply on top. */
export const battlePassInput = z.object({ level: z.number().int().min(0).max(200), weeklyXp: z.number().int().min(0).max(1_000_000) });
export const monthlyPassInput = z.object({ daysLeft: z.number().int().min(0).max(365) });

/**
 * The passes as of now: the level counts within the current version and the
 * weekly XP within the current week (each was typed then); the levels a day
 * left to reach the cap before the version ends; the 30-day pass's days left.
 */
export function passView(
  game: GameDefinition,
  region: GameRegion,
  now: Date,
  battle: { level: number; weeklyXp: number; updatedAt: Date } | null,
  monthly: { endsAt: Date } | null,
) {
  const v = game.manifest.version;
  const version = cadenceWindow({ cadence: "version", start: v.start, days: v.days }, region, now);
  const week = cadenceWindow({ cadence: "weekly" }, region, now);
  const level = battle && battle.updatedAt >= version.start ? battle.level : 0;
  const weeklyXp = battle && battle.updatedAt >= week.start ? battle.weeklyXp : 0;
  const versionDaysLeft = Math.max(0, Math.ceil((version.end.getTime() - now.getTime()) / DAY));
  const maxLevel = game.manifest.battlePass?.maxLevel ?? null;
  return {
    level,
    weeklyXp,
    maxLevel,
    weeklyXpCap: game.manifest.battlePass?.weeklyXpCap ?? null,
    versionDaysLeft,
    levelsPerDay: maxLevel !== null && versionDaysLeft > 0 ? Math.max(0, maxLevel - level) / versionDaysLeft : null,
    monthlyDaysLeft: monthly ? Math.max(0, Math.ceil((monthly.endsAt.getTime() - now.getTime()) / DAY)) : null,
  };
}
