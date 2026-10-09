import { z } from "zod";
import { LIMITS } from "../common.js";
import { gameKeySchema, idSchema, isoDate } from "./common.js";

/** A user's profile for one game (exactly one per user per game). */
export const instanceDto = z.object({
  id: idSchema,
  gameKey: gameKeySchema,
  regionKey: z.string(),
  /** Asleep: hidden from Home and skipped by reminders. */
  sleeping: z.boolean(),
  uid: z.string().nullable(),
  accountLevel: z.number().int().nullable(),
  createdAt: isoDate,
});
export type InstanceDto = z.infer<typeof instanceDto>;

export const createInstanceInput = z.object({ gameKey: gameKeySchema });
export type CreateInstanceInput = z.infer<typeof createInstanceInput>;

export const updateInstanceInput = z.object({
  regionKey: z.string().min(1).max(64).optional(),
  sleeping: z.boolean().optional(),
  uid: z.string().trim().min(1).max(LIMITS.uidLength).regex(/^[A-Za-z0-9-]+$/).nullable().optional(),
  accountLevel: z.number().int().min(1).max(LIMITS.accountLevel).nullable().optional(),
});
export type UpdateInstanceInput = z.infer<typeof updateInstanceInput>;
