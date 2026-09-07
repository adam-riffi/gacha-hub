import type { FastifyInstance } from "fastify";
import { getGame } from "@gacha/shared";
import { requireUser } from "../auth/plugin.js";
import { listBanners, listEvents, parseTimelineFilter } from "../lib/timeline.js";

/** Read side of banners & events: global per game, visible to every user. */
export async function registerTimelineRoutes(app: FastifyInstance) {
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
