import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getGame, timelineDto, UnitBannerAppearances, unitAppearancesDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { listBanners, listEvents, listWindow, parseTimelineFilter, withFeaturedDetails } from "../lib/timeline.js";

const MAX_WINDOW_DAYS = 120;
const windowQuery = z
  .object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }) })
  .refine((query) => Date.parse(query.to) > Date.parse(query.from), { message: "to must be after from" })
  .refine((query) => Date.parse(query.to) - Date.parse(query.from) <= MAX_WINDOW_DAYS * 86_400_000, { message: `at most ${MAX_WINDOW_DAYS} days` });

/** Read side of banners & events: global per game, visible to every user. */
export async function registerTimelineRoutes(app: FastifyInstance) {
  // The calendar: everything overlapping a window, for the user's games, ended
  // items included, featured units with catalog details and ownership.
  app.get<{ Querystring: { from?: string; to?: string } }>("/api/timeline", { preHandler: requireUser }, async (req) => {
    const parsedQuery = windowQuery.parse(req.query);
    const instances = await prisma.gameInstance.findMany({ where: { userId: req.user!.id }, select: { id: true, gameKey: true } });
    const { banners, events } = await listWindow(instances.map((instance) => instance.gameKey), new Date(parsedQuery.from), new Date(parsedQuery.to));
    return timelineDto.parse({ banners: await withFeaturedDetails(banners, instances), events });
  });

  app.get<{ Params: { key: string }; Querystring: { status?: string } }>(
    "/api/games/:key/banners",
    { preHandler: requireUser },
    async (req, reply) => {
      const game = getGame(req.params.key);
      if (!game) return reply.code(404).send({ error: "unknown_game" });
      return listBanners([game.key], parseTimelineFilter(req.query.status));
    },
  );

  // Each unit's banners, every one the game has on record (round 11: "last seen").
  app.get<{ Params: { key: string } }>("/api/games/:key/appearances", { preHandler: requireUser }, async (req, reply) => {
    const game = getGame(req.params.key);
    if (!game) return reply.code(404).send({ error: "unknown_game" });
    const banners = await prisma.banner.findMany({ where: { gameKey: game.key }, select: { key: true, name: true, startsAt: true, endsAt: true, featured: true } });
    const storedBanners = banners.map((banner) => ({ ...banner, featured: Array.isArray(banner.featured) ? (banner.featured as { catalogId: string }[]) : [] }));
    const historyBanners = (await game.loadBannerHistory?.())?.banners ?? [];
    return unitAppearancesDto.parse(new UnitBannerAppearances(UnitBannerAppearances.withHistory(storedBanners, historyBanners)).toRecord());
  });

  app.get<{ Params: { key: string }; Querystring: { status?: string } }>(
    "/api/games/:key/events",
    { preHandler: requireUser },
    async (req, reply) => {
      const game = getGame(req.params.key);
      if (!game) return reply.code(404).send({ error: "unknown_game" });
      return listEvents([game.key], parseTimelineFilter(req.query.status));
    },
  );
}
