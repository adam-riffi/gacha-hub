import type { FastifyInstance } from "fastify";
import {
  DEFAULT_REGION_KEY,
  characterSummaryDto,
  createInstanceInput,
  currencyStateDto,
  gameList,
  getGame,
  instanceDto,
  setCurrencyInput,
  updateInstanceInput,
} from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, loadInstance } from "./util.js";

/** Attach the game module's display info to an instance row. */
function withGame<T extends { gameKey: string }>(row: T) {
  const game = getGame(row.gameKey);
  return { ...row, name: game?.name ?? row.gameKey, accent: game?.accent ?? "#7c8cff" };
}

export async function registerGameRoutes(app: FastifyInstance) {
  // Catalog of hardcoded games available to install.
  app.get("/api/games", { preHandler: requireUser }, async () => {
    return gameList.map((g) => ({
      key: g.key,
      name: g.name,
      accent: g.accent,
      currencies: g.currencies.length,
      regions: g.regions.map((r) => ({ key: r.key, label: r.label })),
    }));
  });

  // ---- Profiles (one per user per game) ----
  app.get("/api/instances", { preHandler: requireUser }, async (req) => {
    const rows = await prisma.gameInstance.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => withGame(instanceDto.parse(r)));
  });

  // Install a game. Idempotent: returns the existing profile if one exists.
  app.post("/api/instances", { preHandler: requireUser }, async (req, reply) => {
    const userId = req.user!.id;
    const { gameKey } = createInstanceInput.parse(req.body);
    const game = gameOrThrow(gameKey);

    const existing = await prisma.gameInstance.findUnique({
      where: { userId_gameKey: { userId, gameKey } },
    });
    if (existing) return { id: existing.id, existed: true };

    const regionKey = game.regions.some((r) => r.key === DEFAULT_REGION_KEY)
      ? DEFAULT_REGION_KEY
      : (game.regions[0]?.key ?? DEFAULT_REGION_KEY);

    const created = await prisma.gameInstance.create({
      data: {
        userId,
        gameKey,
        regionKey,
        currencies: { create: game.currencies.map((c) => ({ key: c.key, value: 0 })) },
      },
    });

    if (game.defaultTasks.length > 0) {
      await prisma.task.createMany({
        data: game.defaultTasks.map((t) => ({
          userId,
          scope: "game",
          refId: created.id,
          type: "recurring",
          title: t.title,
          cadence: t.cadence,
          regionAware: true,
        })),
      });
    }
    return reply.code(201).send({ id: created.id, existed: false });
  });

  // Profile detail: currencies + characters.
  app.get<{ Params: { id: string } }>(
    "/api/instances/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await prisma.gameInstance.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
        include: {
          currencies: { orderBy: { key: "asc" } },
          characters: { orderBy: { createdAt: "asc" } },
        },
      });
      if (!gi) return reply.code(404).send({ error: "not_found" });
      return {
        ...withGame(instanceDto.parse(gi)),
        currencies: gi.currencies.map((c) => currencyStateDto.parse(c)),
        characters: gi.characters.map((c) => characterSummaryDto.parse(c)),
      };
    },
  );

  // Change region (must be one the game offers).
  app.put<{ Params: { id: string } }>(
    "/api/instances/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const { regionKey } = updateInstanceInput.parse(req.body);
      const game = gameOrThrow(gi.gameKey);
      if (!game.regions.some((r) => r.key === regionKey)) {
        return reply.code(400).send({ error: "unknown_region" });
      }
      const updated = await prisma.gameInstance.update({
        where: { id: gi.id },
        data: { regionKey },
      });
      return withGame(instanceDto.parse(updated));
    },
  );

  // Uninstall: cascades currencies/characters/ownership/stock/reminders; tasks
  // are user-owned so clean up the ones scoped to this profile explicitly.
  app.delete<{ Params: { id: string } }>(
    "/api/instances/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const characters = await prisma.character.findMany({
        where: { gameInstanceId: gi.id },
        select: { id: true },
      });
      await prisma.task.deleteMany({
        where: {
          userId: req.user!.id,
          OR: [
            { scope: "game", refId: gi.id },
            { scope: "character", refId: { in: characters.map((c) => c.id) } },
          ],
        },
      });
      await prisma.gameInstance.delete({ where: { id: gi.id } });
      return { ok: true };
    },
  );

  // ---- Currency updates ----
  app.put<{ Params: { id: string; key: string } }>(
    "/api/instances/:id/currencies/:key",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const key = req.params.key;
      if (!game.currencies.some((c) => c.key === key)) {
        return reply.code(400).send({ error: "unknown_currency" });
      }
      const { value } = setCurrencyInput.parse(req.body);
      const row = await prisma.currencyState.upsert({
        where: { gameInstanceId_key: { gameInstanceId: gi.id, key } },
        create: { gameInstanceId: gi.id, key, value },
        update: { value },
      });
      return currencyStateDto.parse(row);
    },
  );

  // Recreate any of the game's default recurring tasks that are missing
  // (idempotent by title) — a "restore defaults" for deleted dailies/weeklies.
  app.post<{ Params: { id: string } }>(
    "/api/instances/:id/tasks/defaults",
    { preHandler: requireUser },
    async (req, reply) => {
      const userId = req.user!.id;
      const gi = await loadInstance(userId, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const existing = await prisma.task.findMany({
        where: { userId, scope: "game", refId: gi.id, type: "recurring" },
        select: { title: true },
      });
      const have = new Set(existing.map((t) => t.title.toLowerCase()));
      const missing = game.defaultTasks.filter((t) => !have.has(t.title.toLowerCase()));
      if (missing.length > 0) {
        await prisma.task.createMany({
          data: missing.map((t) => ({
            userId,
            scope: "game",
            refId: gi.id,
            type: "recurring",
            title: t.title,
            cadence: t.cadence,
            regionAware: true,
          })),
        });
      }
      return { created: missing.length, restored: missing.map((t) => t.title) };
    },
  );
}
