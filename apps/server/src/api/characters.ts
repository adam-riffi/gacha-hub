import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, loadAccount, loadCharacter, validateDoc, type PrismaJson } from "./util.js";

const createInput = z.object({
  name: z.string().min(1).max(120),
  portraitUrl: z.string().max(2048).optional().nullable(),
  doc: z.unknown().optional(),
});

const updateInput = z.object({
  name: z.string().min(1).max(120).optional(),
  portraitUrl: z.string().max(2048).optional().nullable(),
  doc: z.unknown().optional(),
});

export async function registerCharacterRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    "/api/accounts/:id/characters",
    { preHandler: requireUser },
    async (req, reply) => {
      const account = await loadAccount(req.user!.id, req.params.id);
      if (!account) return reply.code(404).send({ error: "not_found" });
      return prisma.character.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: "asc" },
      });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/accounts/:id/characters",
    { preHandler: requireUser },
    async (req, reply) => {
      const account = await loadAccount(req.user!.id, req.params.id);
      if (!account) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(account.gameInstance.gameKey);
      const body = createInput.parse(req.body);
      const doc = validateDoc(game, body.doc ?? game.emptyDoc());
      const created = await prisma.character.create({
        data: {
          accountId: account.id,
          name: body.name,
          portraitUrl: body.portraitUrl ?? null,
          doc: doc as PrismaJson,
        },
      });
      return reply.code(201).send(created);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/characters/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const character = await loadCharacter(req.user!.id, req.params.id);
      if (!character) return reply.code(404).send({ error: "not_found" });
      return {
        id: character.id,
        accountId: character.accountId,
        gameKey: character.account.gameInstance.gameKey,
        name: character.name,
        portraitUrl: character.portraitUrl,
        doc: character.doc,
      };
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/characters/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const character = await loadCharacter(req.user!.id, req.params.id);
      if (!character) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(character.account.gameInstance.gameKey);
      const body = updateInput.parse(req.body);
      await prisma.character.update({
        where: { id: character.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.portraitUrl !== undefined ? { portraitUrl: body.portraitUrl } : {}),
          ...(body.doc !== undefined
            ? { doc: validateDoc(game, body.doc) as PrismaJson }
            : {}),
        },
      });
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/characters/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const character = await loadCharacter(req.user!.id, req.params.id);
      if (!character) return reply.code(404).send({ error: "not_found" });
      await prisma.task.deleteMany({
        where: { userId: req.user!.id, scope: "character", refId: character.id },
      });
      await prisma.character.delete({ where: { id: character.id } });
      return { ok: true };
    },
  );
}
