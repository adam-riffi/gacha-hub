import { z } from "zod";
import { gameKeySchema, idSchema, isoDate } from "./common.js";

/** A user's profile for one game (exactly one per user per game). */
export const instanceDto = z.object({
  id: idSchema,
  gameKey: gameKeySchema,
  regionKey: z.string(),
  createdAt: isoDate,
});
export type InstanceDto = z.infer<typeof instanceDto>;

export const createInstanceInput = z.object({ gameKey: gameKeySchema });
export type CreateInstanceInput = z.infer<typeof createInstanceInput>;

export const updateInstanceInput = z.object({
  regionKey: z.string().min(1).max(64),
});
export type UpdateInstanceInput = z.infer<typeof updateInstanceInput>;
