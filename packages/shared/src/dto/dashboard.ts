import { z } from "zod";
import { taskDto } from "./task.js";
import { bannerDto } from "./banner.js";
import { eventDto } from "./event.js";
import { gameKeySchema, idSchema, isoDateNullable } from "./common.js";

export const dashboardCurrencyDto = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  cap: z.number().nullable(),
  regenPerHour: z.number().nullable(),
});

export const dashboardGameDto = z.object({
  instanceId: idSchema,
  gameKey: gameKeySchema,
  name: z.string(),
  accent: z.string(),
  regionKey: z.string(),
  characterCount: z.number().int(),
  currencies: z.array(dashboardCurrencyDto),
  dailies: z.array(taskDto),
  nextReset: isoDateNullable,
  /** Per-game extras from the game's server module (bespoke widgets). */
  extras: z.unknown().optional(),
});

/** Active + upcoming banners/events across the user's installed games. */
export const timelineDto = z.object({
  banners: z.array(bannerDto),
  events: z.array(eventDto),
});
export type TimelineDto = z.infer<typeof timelineDto>;

export const dashboardDto = z.object({
  games: z.array(dashboardGameDto),
  goals: z.array(taskDto),
  timeline: timelineDto,
});
export type DashboardDto = z.infer<typeof dashboardDto>;
