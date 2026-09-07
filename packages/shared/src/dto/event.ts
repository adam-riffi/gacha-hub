import { z } from "zod";
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
    url: z.string().url().max(2048).optional(),
    payload: z.record(jsonValue).optional(),
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
  url: z.string().nullable(),
  payload: jsonValue.nullable(),
  status: timedStatusSchema,
  updatedAt: isoDate,
});
export type EventDto = z.infer<typeof eventDto>;
