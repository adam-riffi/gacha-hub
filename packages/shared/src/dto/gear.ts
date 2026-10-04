import { z } from "zod";
import { statRowSchema } from "../common.js";
import { idSchema } from "./common.js";

/** A gear piece in the bag (unequipped). Same fields a build stores per slot. */
export const gearPieceDto = z.object({
  id: idSchema,
  setName: z.string(),
  slot: z.string(),
  level: z.number().int(),
  mainStat: z.string(),
  substats: z.array(statRowSchema),
});
export type GearPieceDto = z.infer<typeof gearPieceDto>;

export const gearPieceInput = z.object({
  setName: z.string().max(120).default(""),
  slot: z.string().min(1).max(40),
  level: z.number().int().min(0).max(25).default(0),
  mainStat: z.string().max(60).default(""),
  substats: z.array(statRowSchema).max(4).default([]),
});
export type GearPieceInput = z.infer<typeof gearPieceInput>;

export const equipGearInput = z.object({ characterId: idSchema });
export const unequipGearInput = z.object({ slot: z.string().min(1).max(40) });
