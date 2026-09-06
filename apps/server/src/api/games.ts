import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { gameList, getGame } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, loadAccount, loadInstance } from "./util.js";

const accountInput = z.object({
  label: z.string().min(1).max(120),
  regionKey: z.string().max(64).optional().nullable(),
});

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

  // A user's installed games.
  app.get("/api/instances", { preHandler: requireUser }, async (req) => {
    const instances = await prisma.gameInstance.findMany({
      where: { userId: req.user!.id },
      include: { accounts: { select: { id: true, label: true, regionKey: true } } },
      orderBy: { createdAt: "asc" },
    });
    return instances.map((gi) => {
      const game = getGame(gi.gameKey);
      return {
        id: gi.id,
        gameKey: gi.gameKey,
        name: game?.name ?? gi.gameKey,
        accent: game?.accent ?? "#7c8cff",
        accounts: gi.accounts,
      };
    });
  });

  // Install a game by key.
  app.post<{ Body: { gameKey: string } }>(
    "/api/instances",
    { preHandler: requireUser },
    async (req, reply) => {
      const gameKey = z.string().min(1).parse(req.body?.gameKey);
      gameOrThrow(gameKey);
      const created = await prisma.gameInstance.create({
        data: { userId: req.user!.id, gameKey },
      });
      return reply.code(201).send({ id: created.id });
    },
  );

  // Instance detail (accounts + currencies + characters).
  app.get<{ Params: { id: string } }>(
    "/api/instances/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await prisma.gameInstance.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
        include: {
          accounts: {
            include: {
              currencies: true,
              characters: { select: { id: true, name: true, portraitUrl: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!gi) return reply.code(404).send({ error: "not_found" });
      return { id: gi.id, gameKey: gi.gameKey, accounts: gi.accounts };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/instances/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      await prisma.gameInstance.delete({ where: { id: gi.id } });
      return { ok: true };
    },
  );

  // ---- Accounts ----
  app.post<{ Params: { id: string } }>(
    "/api/instances/:id/accounts",
    { preHandler: requireUser },
    async (req, reply) => {
      const userId = req.user!.id;
      const gi = await loadInstance(userId, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const body = accountInput.parse(req.body);

      const account = await prisma.account.create({
        data: {
          gameInstanceId: gi.id,
          label: body.label,
          regionKey: body.regionKey ?? game.regions[0]?.key ?? null,
          currencies: {
            create: game.currencies.map((c) => ({ key: c.key, value: 0 })),
          },
        },
      });

      if (game.defaultTasks.length > 0) {
        await prisma.task.createMany({
          data: game.defaultTasks.map((t) => ({
            userId,
            scope: "account",
            refId: account.id,
            type: "recurring",
            title: t.title,
            cadence: t.cadence,
            regionAware: true,
          })),
        });
      }
      return reply.code(201).send({ id: account.id });
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/accounts/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const account = await loadAccount(req.user!.id, req.params.id);
      if (!account) return reply.code(404).send({ error: "not_found" });
      const body = accountInput.partial().parse(req.body);
      await prisma.account.update({
        where: { id: account.id },
        data: {
          ...(body.label !== undefined ? { label: body.label } : {}),
          ...(body.regionKey !== undefined ? { regionKey: body.regionKey } : {}),
        },
      });
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/accounts/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const account = await loadAccount(req.user!.id, req.params.id);
      if (!account) return reply.code(404).send({ error: "not_found" });
      await prisma.task.deleteMany({
        where: { userId: req.user!.id, scope: "account", refId: account.id },
      });
      await prisma.account.delete({ where: { id: account.id } });
      return { ok: true };
    },
  );

  // ---- Currency updates ----
  app.put<{ Params: { id: string; key: string }; Body: { value: number } }>(
    "/api/accounts/:id/currencies/:key",
    { preHandler: requireUser },
    async (req, reply) => {
      const account = await loadAccount(req.user!.id, req.params.id);
      if (!account) return reply.code(404).send({ error: "not_found" });
      const value = z.number().min(0).parse(req.body?.value);
      const key = req.params.key;
      await prisma.currencyState.upsert({
        where: { accountId_key: { accountId: account.id, key } },
        create: { accountId: account.id, key, value },
        update: { value },
      });
      return { ok: true };
    },
  );
}
