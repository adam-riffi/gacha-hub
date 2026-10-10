import { LIMITS } from "../common.js";
import { z } from "zod";
import { buildStatusSchema } from "../common.js";
import { catalogIdSchema, idSchema, isoDate, jsonValue } from "./common.js";

/**
 * A tracked character build. `catalogId` links to the game's catalog entry
 * (optional until catalogs ship; required once ownership is catalog-backed).
 * `doc` is the game's bespoke build document, validated per game.
 */
export const characterDto = z.object({
  id: idSchema,
  gameInstanceId: idSchema,
  catalogId: z.string().nullable(),
  name: z.string(),
  portraitUrl: z.string().nullable(),
  doc: jsonValue,
  docVersion: z.number().int(),
  buildStatus: buildStatusSchema,
  role: z.string().nullable(),
  targets: z.record(z.string(), z.number()).nullable().default(null),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type CharacterDto = z.infer<typeof characterDto>;

/** A unit on the profile's wishlist (WIREFRAMES.md G4). */
export const wishlistItemDto = z.object({ kind: z.enum(["character", "weapon"]), catalogId: z.string(), createdAt: isoDate });
export type WishlistItemDto = z.infer<typeof wishlistItemDto>;
export const setWishlistInput = z.object({ kind: z.enum(["character", "weapon"]), catalogId: catalogIdSchema, wished: z.boolean() });

/** Lightweight listing shape. */
export const characterSummaryDto = characterDto.pick({
  id: true,
  catalogId: true,
  name: true,
  portraitUrl: true,
  buildStatus: true,
});
export type CharacterSummaryDto = z.infer<typeof characterSummaryDto>;

/**
 * Games with a catalog require `catalogId` (name defaults to the catalog
 * name); games without one require `name`. The server enforces which.
 */
export const createCharacterInput = z.object({
  catalogId: catalogIdSchema.optional(),
  name: z.string().min(1).max(120).optional(),
  portraitUrl: z.string().max(2048).nullable().optional(),
  doc: jsonValue.optional(),
  buildStatus: buildStatusSchema.optional(),
  /** One of the game's KPI roles (checked against the game on save). */
  role: z.string().max(40).nullable().optional(),
  /** A target per numeric KPI (checked against the game's KPIs on save); null clears them. */
  targets: z
    .record(z.string().max(60), z.number().min(0).max(LIMITS.kpiTarget))
    .refine((t) => Object.keys(t).length <= 12)
    .nullable()
    .optional(),
});
export type CreateCharacterInput = z.infer<typeof createCharacterInput>;

export const updateCharacterInput = createCharacterInput.partial();
export type UpdateCharacterInput = z.infer<typeof updateCharacterInput>;
