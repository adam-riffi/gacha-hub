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
