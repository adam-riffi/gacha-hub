import { z } from "zod";
import { effectSchema } from "../effects.js";
import { timedStatusSchema } from "./banner.js";
import { gameKeySchema, idSchema, isoDate, jsonValue, slugSchema } from "./common.js";

/** Admin-authored event (also the export shape). */
export const eventInput = z
  .object({
    key: slugSchema,
    name: z.string().min(1).max(160),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    description: z.string().max(4000).optional(),
    rewards: z.array(z.object({ label: z.string().min(1).max(120), qty: z.number().int().min(0).optional() })).max(50).optional(),
    /** Effect[] (ADR 0008); read per game on upload, unknown kinds kept as notes. */
    effects: z.array(z.unknown()).max(50).optional(),
    url: z.string().url().max(2048).optional(),
    payload: z.record(z.string(), jsonValue).optional(),
  })
  .refine((e) => new Date(e.endsAt) > new Date(e.startsAt), {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });
export type EventInput = z.infer<typeof eventInput>;

export const eventDto = z.object({
  id: idSchema,
  gameKey: gameKeySchema,
  key: z.string(),
  name: z.string(),
  startsAt: isoDate,
  endsAt: isoDate,
  description: z.string().nullable(),
  rewards: jsonValue.nullable(),
  effects: z.array(effectSchema).nullable(),
  url: z.string().nullable(),
  payload: jsonValue.nullable(),
  status: timedStatusSchema,
  updatedAt: isoDate,
});
export type EventDto = z.infer<typeof eventDto>;

/** One roster step a reward takes (`from` null: not owned yet). */
export const rosterChangeDto = z.object({
  unit: z.enum(["character", "weapon"]),
  catalogId: z.string(),
  name: z.string(),
  letter: z.string(),
  from: z.number().int().nullable(),
  to: z.number().int(),
});

/** An open event whose rewards change the roster, for one profile (WIREFRAMES.md A4). */
export const rewardDto = z.object({
  eventId: idSchema,
  gameKey: gameKeySchema,
  instanceId: idSchema,
  name: z.string(),
  startsAt: isoDate,
  endsAt: isoDate,
  options: z.array(z.object({ label: z.string().nullable(), changes: z.array(rosterChangeDto), others: z.array(z.string()) })),
  others: z.array(z.string()),
  stages: z.number().int(),
  goal: z.object({ id: idSchema, choice: z.number().int().nullable(), claimed: z.boolean(), done: z.number().int(), notify: z.boolean() }).nullable(),
});
export type RewardDto = z.infer<typeof rewardDto>;
