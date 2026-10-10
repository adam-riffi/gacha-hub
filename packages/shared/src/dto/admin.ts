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
    items: z.array(z.record(z.string(), jsonValue)).min(1).max(5000),
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

/** Audit row with the actor's display name for the admin page. */
export const adminAuditEntryDto = auditLogDto.extend({ actorName: z.string() });
export type AdminAuditEntryDto = z.infer<typeof adminAuditEntryDto>;

/** What GET /api/admin/export returns: exactly an uploadable payload. */
export const adminExportKindSchema = z.enum(["banners", "events"]);
export type AdminExportKind = z.infer<typeof adminExportKindSchema>;

/** The admin overview (Georges, 2026-10-10: Admin felt light): totals, users, each game's content, the latest imports. */
const count = z.number().int();
export const adminStatsDto = z.object({
  totals: z.object({ users: count, profiles: count, builds: count, pulls: count, goals: count, teams: count, links: count }),
  users: z.array(z.object({ username: z.string(), createdAt: isoDate, games: count, builds: count, gameKeys: z.array(z.string()) })),
  games: z.array(
    z.object({
      gameKey: z.string(),
      name: z.string(),
      profiles: count,
      /** An official feed imports this game's banners and events; the others are typed in by an admin. */
      feed: z.boolean(),
      banners: z.object({ active: count, upcoming: count }),
      events: z.object({ active: count, upcoming: count }),
    }),
  ),
  imports: z.array(z.object({ username: z.string(), provider: z.string(), kind: z.string(), added: count, skipped: count, error: z.string().nullable(), createdAt: isoDate })),
});
export type AdminStatsDto = z.infer<typeof adminStatsDto>;
