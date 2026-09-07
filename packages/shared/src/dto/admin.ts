import { z } from "zod";
import { bannerInput } from "./banner.js";
import { eventInput } from "./event.js";
import { gameKeySchema, idSchema, isoDate, jsonValue } from "./common.js";

/**
 * The JSON payload an admin uploads. Items are upserted by `key` within the
 * game; the same shapes are what the API exports, so edit→upload round-trips.
 */
export const adminPayloadInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("banners"),
    gameKey: gameKeySchema,
    items: z.array(bannerInput).min(1).max(200),
  }),
  z.object({
    kind: z.literal("events"),
    gameKey: gameKeySchema,
    items: z.array(eventInput).min(1).max(200),
  }),
  z.object({
    kind: z.literal("catalog-patch"),
    gameKey: gameKeySchema,
    items: z.array(z.record(jsonValue)).min(1).max(5000),
  }),
]);
export type AdminPayloadInput = z.infer<typeof adminPayloadInput>;

export const adminPayloadResult = z.object({
  kind: z.string(),
  gameKey: gameKeySchema,
  created: z.number().int(),
  updated: z.number().int(),
});
export type AdminPayloadResult = z.infer<typeof adminPayloadResult>;

export const auditLogDto = z.object({
  id: idSchema,
  actorUserId: idSchema,
  action: z.string(),
  targetKind: z.string(),
  targetKey: z.string(),
  diff: jsonValue.nullable(),
  createdAt: isoDate,
});
export type AuditLogDto = z.infer<typeof auditLogDto>;
