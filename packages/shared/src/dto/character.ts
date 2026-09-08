import { z } from "zod";
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
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type CharacterDto = z.infer<typeof characterDto>;

/** Lightweight listing shape. */
export const characterSummaryDto = characterDto.pick({
  id: true,
  catalogId: true,
  name: true,
  portraitUrl: true,
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
});
export type CreateCharacterInput = z.infer<typeof createCharacterInput>;

export const updateCharacterInput = createCharacterInput.partial();
export type UpdateCharacterInput = z.infer<typeof updateCharacterInput>;
