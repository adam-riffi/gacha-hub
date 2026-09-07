import { z } from "zod";
import { taskDto } from "./task.js";
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
});

export const dashboardDto = z.object({
  games: z.array(dashboardGameDto),
  goals: z.array(taskDto),
});
export type DashboardDto = z.infer<typeof dashboardDto>;
