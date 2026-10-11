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

/** One copy of a weapon (Georges, 2026-10-11: each dupe its own entry): from the catalog, or named by hand where the game has none. */
export const weaponCopyDto = z.object({
  id: z.string(),
  catalogId: z.string().nullable(),
  name: z.string(),
  level: z.number().int(),
  refinement: z.number().int(),
});
export type WeaponCopyDto = z.infer<typeof weaponCopyDto>;

const copyFields = {
  level: z.number().int().min(1).max(100).optional(),
  refinement: z.number().int().min(1).max(10).optional(),
};
export const createWeaponCopyInput = z
  .object({ catalogId: catalogIdSchema.optional(), name: z.string().trim().min(1).max(80).optional(), ...copyFields })
  .strict()
  .refine((v) => v.catalogId || v.name, { message: "a catalog id or a name" });
export const updateWeaponCopyInput = z.object({ name: z.string().trim().min(1).max(80).optional(), ...copyFields }).strict();

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
