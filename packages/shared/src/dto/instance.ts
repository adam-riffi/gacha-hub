import { z } from "zod";
import { LIMITS } from "../common.js";
import { gameKeySchema, idSchema, isoDate, kpiTargetsInput } from "./common.js";

/** A user's profile for one game (exactly one per user per game). */
export const instanceDto = z.object({
  id: idSchema,
  gameKey: gameKeySchema,
  regionKey: z.string(),
  /** Asleep: hidden from Home and skipped by reminders. */
  sleeping: z.boolean(),
  uid: z.string().nullable(),
  accountLevel: z.number().int().nullable(),
  worldLevel: z.number().int().nullable(),
  /** Default KPI targets for the game's builds without their own. */
  kpiTargets: z.record(z.string(), z.number()).nullable().default(null),
  /** Long-term progress from a linked account's record card, synced. */
  progress: z.array(z.object({ name: z.string(), value: z.string() })).nullable().default(null),
  createdAt: isoDate,
});
export type InstanceDto = z.infer<typeof instanceDto>;

export const createInstanceInput = z.object({ gameKey: gameKeySchema });
export type CreateInstanceInput = z.infer<typeof createInstanceInput>;

/** Every profile of the user, in the order the top strip shows them. */
export const instanceOrderInput = z.object({ ids: z.array(idSchema).min(1).max(50) });

export const updateInstanceInput = z.object({
  regionKey: z.string().min(1).max(64).optional(),
  sleeping: z.boolean().optional(),
  uid: z.string().trim().min(1).max(LIMITS.uidLength).regex(/^[A-Za-z0-9-]+$/).nullable().optional(),
  accountLevel: z.number().int().min(1).max(LIMITS.accountLevel).nullable().optional(),
  /** Checked against the game's own highest (`manifest.worldLevel.max`) by the route. */
  worldLevel: z.number().int().min(0).max(LIMITS.worldLevel).nullable().optional(),
  /** The game's default KPI targets; null clears them. */
  kpiTargets: kpiTargetsInput.nullable().optional(),
});
export type UpdateInstanceInput = z.infer<typeof updateInstanceInput>;
