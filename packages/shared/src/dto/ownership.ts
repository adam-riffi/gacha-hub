import { z } from "zod";
import { LIMITS } from "../common.js";
import { catalogIdSchema, jsonValue, nonNegInt } from "./common.js";

export const ownershipKindSchema = z.enum(["character", "weapon", "item"]);
export type OwnershipKind = z.infer<typeof ownershipKindSchema>;

/** One owned catalog entry for a game profile. */
export const ownershipDto = z.object({
  kind: ownershipKindSchema,
  catalogId: catalogIdSchema,
  qty: nonNegInt,
  meta: jsonValue.nullable(),
});
export type OwnershipDto = z.infer<typeof ownershipDto>;

/** An owned weapon's level and refinement (or superimposition, phase…), on its row (Georges, 2026-10-11). */
export const weaponMetaSchema = z
  .object({
    level: z.number().int().min(1).max(100).optional(),
    refinement: z.number().int().min(1).max(10).optional(),
  })
  .strict();
export type WeaponMetaDto = z.infer<typeof weaponMetaSchema>;

/** Bulk toggle: `owned: false` removes the row. */
export const setOwnershipInput = z.object({
  items: z
    .array(
      z.object({
        kind: ownershipKindSchema,
        catalogId: catalogIdSchema,
        owned: z.boolean(),
        qty: nonNegInt.max(LIMITS.ownershipQty).optional(),
        meta: jsonValue.optional(),
      }),
    )
    .min(1)
    .max(2000),
});
export type SetOwnershipInput = z.infer<typeof setOwnershipInput>;
