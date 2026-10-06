import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getGame, timelineDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { listBanners, listEvents, listWindow, parseTimelineFilter, withFeaturedDetails } from "../lib/timeline.js";

const MAX_WINDOW_DAYS = 120;
const windowQuery = z
  .object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }) })
  .refine((q) => Date.parse(q.to) > Date.parse(q.from), { message: "to must be after from" })
  .refine((q) => Date.parse(q.to) - Date.parse(q.from) <= MAX_WINDOW_DAYS * 86_400_000, { message: `at most ${MAX_WINDOW_DAYS} days` });

/** Read side of banners & events: global per game, visible to every user. */
export async function registerTimelineRoutes(app: FastifyInstance) {
  // The calendar: everything overlapping a window, for the user's games, ended
  // items included, featured units with catalog details and ownership.
  app.get<{ Querystring: { from?: string; to?: string } }>("/api/timeline", { preHandler: requireUser }, async (req) => {
    const q = windowQuery.parse(req.query);
    const instances = await prisma.gameInstance.findMany({ where: { userId: req.user!.id }, select: { id: true, gameKey: true } });
    const { banners, events } = await listWindow(instances.map((g) => g.gameKey), new Date(q.from), new Date(q.to));
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
