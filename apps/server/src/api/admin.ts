import type { FastifyInstance } from "fastify";
import { Prisma } from "../generated/prisma/client.js";
import { z } from "zod";
import {
  adminAuditEntryDto,
  adminStatsDto,
  gameList,
  adminExportKindSchema,
  adminPayloadInput,
  adminPayloadResult,
  gameKeySchema,
  getGame,
  readEffects,
  type BannerInput,
  type EventInput,
} from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../auth/plugin.js";
import { exportBanner, exportEvent } from "../lib/timeline.js";
import { gameOrThrow, getCatalog, type PrismaJson } from "./util.js";
import { FEED_GAMES, importOfficialFeed } from "../lib/officialFeed.js";

/* Admin uploads: JSON payloads (banners, events) validated by the shared
 * DTOs, upserted by key within a game, every change audited. The export
 * endpoint returns the same shape, so edit → upload round-trips. */

const RATE = { rateLimit: { max: 30, timeWindow: "1 minute" } };

function duplicateKeys(items: { key: string }[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const i of items) (seen.has(i.key) ? dupes : seen).add(i.key);
  return [...dupes];
}

const jsonOrNull = (v: unknown) => (v === undefined ? Prisma.JsonNull : (v as PrismaJson));

export async function registerAdminRoutes(app: FastifyInstance) {
  // JSON Schema of the upload payload (for editors / validation tooling).
  app.get("/api/admin/payload/schema", { preHandler: requireAdmin }, async () =>
    ({ title: "AdminPayload", ...z.toJSONSchema(adminPayloadInput, { io: "input", unrepresentable: "any" }) }),
  );

  // Current items in the upload shape.
  app.get<{ Querystring: { kind?: string; gameKey?: string } }>(
    "/api/admin/export",
    { preHandler: requireAdmin },
    async (req, reply) => {
      const kind = adminExportKindSchema.parse(req.query.kind);
      const gameKey = gameKeySchema.parse(req.query.gameKey);
      if (!getGame(gameKey)) return reply.code(404).send({ error: "unknown_game" });
      const items =
        kind === "banners"
          ? (await prisma.banner.findMany({ where: { gameKey }, orderBy: { startsAt: "asc" } })).map(exportBanner)
          : (await prisma.event.findMany({ where: { gameKey }, orderBy: { startsAt: "asc" } })).map(exportEvent);
      return { kind, gameKey, items };
    },
  );

  // The overview: totals, users with their games and builds, each game's content, the latest imports.
  app.get("/api/admin/stats", { preHandler: requireAdmin }, async () => {
    const now = new Date();
    const [users, profiles, builds, pulls, goals, teams, links, banners, events, imports] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        select: { username: true, createdAt: true, gameInstances: { select: { gameKey: true, _count: { select: { characters: true } } } } },
      }),
      prisma.gameInstance.groupBy({ by: ["gameKey"], _count: { _all: true } }),
      prisma.character.count(),
      prisma.pullEntry.aggregate({ _sum: { count: true } }),
      prisma.task.count({ where: { parentId: null, type: { not: "recurring" } } }),
      prisma.team.count(),
      prisma.linkedAccount.count(),
      prisma.banner.findMany({ where: { endsAt: { gt: now } }, select: { gameKey: true, startsAt: true } }),
      prisma.event.findMany({ where: { endsAt: { gt: now } }, select: { gameKey: true, startsAt: true } }),
      prisma.importRun.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { username: true } } } }),
    ]);
    const split = (rows: { gameKey: string; startsAt: Date }[], key: string) => {
      const mine = rows.filter((r) => r.gameKey === key);
      return { active: mine.filter((r) => r.startsAt <= now).length, upcoming: mine.filter((r) => r.startsAt > now).length };
    };
    return adminStatsDto.parse({
      totals: {
        users: users.length,
        profiles: profiles.reduce((n, p) => n + p._count._all, 0),
        builds,
        pulls: pulls._sum.count ?? 0,
        goals,
        teams,
        links,
      },
      users: users.map((u) => ({
        username: u.username,
        createdAt: u.createdAt,
        games: u.gameInstances.length,
        builds: u.gameInstances.reduce((n, gi) => n + gi._count.characters, 0),
        gameKeys: u.gameInstances.map((gi) => gi.gameKey),
      })),
      games: gameList.map((g) => ({
        gameKey: g.key,
        name: g.name,
        profiles: profiles.find((p) => p.gameKey === g.key)?._count._all ?? 0,
        feed: FEED_GAMES.includes(g.key),
        banners: split(banners, g.key),
        events: split(events, g.key),
      })),
      imports: imports.map((r) => ({ ...r, username: r.user.username })),
    });
  });

  app.get<{ Querystring: { limit?: string } }>(
    "/api/admin/audit",
    { preHandler: requireAdmin },
    async (req) => {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const rows = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { actor: { select: { username: true } } },
      });
      return rows.map((r) => adminAuditEntryDto.parse({ ...r, actorName: r.actor.username }));
    },
  );

  app.post(
    "/api/admin/payload",
    { preHandler: requireAdmin, config: RATE },
    async (req, reply) => {
      const body = adminPayloadInput.parse(req.body);
      const game = getGame(body.gameKey);
      if (!game) return reply.code(404).send({ error: "unknown_game" });
      if (body.kind === "catalog-patch") {
        return reply.code(501).send({ error: "not_implemented", message: "Catalog changes ship through the importer pipeline for now." });
      }
      const dupes = duplicateKeys(body.items);
      if (dupes.length) return reply.code(400).send({ error: "duplicate_keys", keys: dupes });

      // Featured entries must exist in the game's catalog (when it has one).
      if (body.kind === "banners") {
        const cat = await getCatalog(game);
        if (cat) {
          const unknown = body.items
            .flatMap((b) => b.featured)
            .filter((f) => !(f.kind === "character" ? cat.index.characters : cat.index.weapons).has(f.catalogId))
            .map((f) => f.catalogId);
          if (unknown.length) return reply.code(400).send({ error: "unknown_catalog_id", ids: [...new Set(unknown)].slice(0, 20) });
        }
      }

      const actorUserId = req.user!.id;
      const gameKey = body.gameKey;
      let created = 0;
      let updated = 0;

      await prisma.$transaction(async (tx) => {
        if (body.kind === "banners") {
          for (const item of body.items as BannerInput[]) {
            const prev = await tx.banner.findUnique({ where: { gameKey_key: { gameKey, key: item.key } } });
            const data = {
              name: item.name,
              kind: item.kind,
              startsAt: new Date(item.startsAt),
              endsAt: new Date(item.endsAt),
              featured: item.featured as PrismaJson,
              version: item.version,
              payload: jsonOrNull(item.payload),
            };
            await tx.banner.upsert({
              where: { gameKey_key: { gameKey, key: item.key } },
              create: { gameKey, key: item.key, ...data },
              update: data,
            });
            await tx.auditLog.create({
              data: {
                actorUserId,
                action: prev ? "update" : "create",
                targetKind: "banner",
                targetKey: `${gameKey}/${item.key}`,
                diff: { before: prev ? exportBanner(prev) : null, after: item } as PrismaJson,
              },
            });
            if (prev) updated += 1;
            else created += 1;
          }
        } else {
          for (const item of body.items as EventInput[]) {
            const prev = await tx.event.findUnique({ where: { gameKey_key: { gameKey, key: item.key } } });
            const data = {
              name: item.name,
              startsAt: new Date(item.startsAt),
              endsAt: new Date(item.endsAt),
              description: item.description ?? null,
              rewards: jsonOrNull(item.rewards),
              effects: item.effects ? (readEffects(item.effects, gameOrThrow(gameKey)) as PrismaJson) : Prisma.JsonNull,
              url: item.url ?? null,
              payload: jsonOrNull(item.payload),
            };
            await tx.event.upsert({
              where: { gameKey_key: { gameKey, key: item.key } },
              create: { gameKey, key: item.key, ...data },
              update: data,
            });
            await tx.auditLog.create({
              data: {
                actorUserId,
                action: prev ? "update" : "create",
                targetKind: "event",
                targetKey: `${gameKey}/${item.key}`,
                diff: { before: prev ? exportEvent(prev) : null, after: item } as PrismaJson,
              },
            });
            if (prev) updated += 1;
            else created += 1;
          }
        }
      });

      return adminPayloadResult.parse({ kind: body.kind, gameKey, created, updated });
    },
  );

  // Pull banners/events from the official announcement feed right now.
  app.post<{ Params: { gameKey: string } }>(
    "/api/admin/feed/:gameKey",
    { preHandler: requireAdmin, config: RATE },
    async (req, reply) => {
      if (!FEED_GAMES.includes(req.params.gameKey)) return reply.code(404).send({ error: "no_feed" });
      return importOfficialFeed(req.params.gameKey);
    },
  );

  app.delete<{ Params: { kind: string; gameKey: string; key: string } }>(
    "/api/admin/:kind/:gameKey/:key",
    { preHandler: requireAdmin, config: RATE },
    async (req, reply) => {
      const kind = adminExportKindSchema.parse(req.params.kind);
      const { gameKey, key } = req.params;
      const where = { gameKey_key: { gameKey, key } };
      const audit = (targetKind: "banner" | "event", before: BannerInput | EventInput) =>
        prisma.auditLog.create({
          data: {
            actorUserId: req.user!.id,
            action: "delete",
            targetKind,
            targetKey: `${gameKey}/${key}`,
            diff: { before, after: null } as PrismaJson,
          },
        });
      if (kind === "banners") {
        const prev = await prisma.banner.findUnique({ where });
        if (!prev) return reply.code(404).send({ error: "not_found" });
        await prisma.$transaction([prisma.banner.delete({ where }), audit("banner", exportBanner(prev))]);
      } else {
        const prev = await prisma.event.findUnique({ where });
        if (!prev) return reply.code(404).send({ error: "not_found" });
        await prisma.$transaction([prisma.event.delete({ where }), audit("event", exportEvent(prev))]);
      }
      return { ok: true };
    },
  );
}
