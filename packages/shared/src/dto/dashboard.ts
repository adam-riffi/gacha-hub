import { z } from "zod";
import { taskDto } from "./task.js";
import { bannerDto } from "./banner.js";
import { eventDto } from "./event.js";
import { gameKeySchema, idSchema, isoDate, isoDateNullable } from "./common.js";

export const dashboardCurrencyDto = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  cap: z.number().nullable(),
  regenPerHour: z.number().nullable(),
  /** Premium currency: units per pull + the pull's name (for a wish count). */
  pullCost: z.number().nullable(),
  pullLabel: z.string().nullable(),
  /** Standard-banner ticket: not counted toward limited pulls. */
  standardOnly: z.boolean(),
});

/** A regenerating resource (Genshin resin, HSR trailblaze power…) projected to now. */
export const regenProjectionDto = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  cap: z.number(),
  regenPerHour: z.number(),
  full: z.boolean(),
  fullAt: isoDateNullable,
});
export type RegenProjectionDto = z.infer<typeof regenProjectionDto>;

/** Items done this cycle over the items there are. */
export const tallyDto = z.object({ done: z.number().int(), total: z.number().int() });

export const dashboardGameDto = z.object({
  instanceId: idSchema,
  gameKey: gameKeySchema,
  name: z.string(),
  accent: z.string(),
  regionKey: z.string(),
  sleeping: z.boolean(),
  characterCount: z.number().int(),
  ownedCharacters: z.number().int(),
  builtCharacters: z.number().int(),
  /** Characters in the game's catalog (null when the game has none). */
  catalogCharacters: z.number().int().nullable(),
  /** Gear pieces in the bag (artifact inventory). */
  gearPieces: z.number().int(),
  currencies: z.array(dashboardCurrencyDto),
  dailies: z.array(taskDto),
  nextReset: isoDateNullable,
  /** Per-game extras from the game's server module (bespoke widgets). */
  extras: z.unknown().optional(),
  /** Pity per banner type (empty for games without pull rules). */
  pity: z.array(z.object({ key: z.string(), label: z.string(), pity: z.number().int(), hardPity: z.number().int(), guaranteed: z.boolean() })),
  /** The game's regenerating currency projected to now; null for a game without one. */
  stamina: regenProjectionDto.nullable(),
  /** Pull batches of the last six weeks, oldest first. */
  pullLog: z.array(z.object({ at: isoDate, count: z.number().int() })),
  /** Day records of the last 26 weeks, oldest first: the server's game day and its tallies. */
  days: z.array(
    z.object({ day: z.string(), dailiesDone: z.number().int(), dailiesTotal: z.number().int(), goalsOpen: z.number().int(), pulls: z.number().int() }),
  ),
  /** Recurring items this cycle: the game's own dailies and weeklies, and the ones you added. */
  recurring: z.object({ daily: tallyDto, dailyTasks: tallyDto, weekly: tallyDto, weeklyTasks: tallyDto }),
});

/** Active + upcoming banners/events across the user's installed games. */
export const timelineDto = z.object({
  banners: z.array(bannerDto),
  events: z.array(eventDto),
});
export type TimelineDto = z.infer<typeof timelineDto>;

/** Per-game dashboard extras from a GameServerModule (shape is game-specific). */
export const gameDashboardExtrasDto = z.object({
  regen: regenProjectionDto.optional(),
});
export type GameDashboardExtras = z.infer<typeof gameDashboardExtrasDto>;

export const dashboardDto = z.object({
  games: z.array(dashboardGameDto),
  goals: z.array(taskDto),
  /** Per goal id: material subtasks done / total (goals without subtasks are absent). */
  goalMaterials: z.record(z.string(), z.object({ done: z.number().int(), total: z.number().int() })),
  timeline: timelineDto,
});
export type DashboardDto = z.infer<typeof dashboardDto>;
