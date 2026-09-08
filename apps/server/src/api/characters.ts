import type { FastifyInstance } from "fastify";
import { characterDto, createCharacterInput, updateCharacterInput } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, loadCharacter, loadInstance, validateDoc, type PrismaJson } from "./util.js";

export async function registerCharacterRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    "/api/instances/:id/characters",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const rows = await prisma.character.findMany({
        where: { gameInstanceId: gi.id },
        orderBy: { createdAt: "asc" },
      });
      return rows.map((r) => characterDto.parse(r));
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/instances/:id/characters",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const body = createCharacterInput.parse(req.body);
      const doc = validateDoc(game, body.doc ?? game.emptyDoc());
      const created = await prisma.character.create({
        data: {
          gameInstanceId: gi.id,
          catalogId: body.catalogId ?? null,
          name: body.name,
          portraitUrl: body.portraitUrl ?? null,
          doc: doc as PrismaJson,
        },
      });
      return reply.code(201).send(characterDto.parse(created));
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/characters/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const character = await loadCharacter(req.user!.id, req.params.id);
      if (!character) return reply.code(404).send({ error: "not_found" });
      return { ...characterDto.parse(character), gameKey: character.gameInstance.gameKey };
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/characters/:id",
    { preHandler: requireUser },
    async (req, reply) => {
      const character = await loadCharacter(req.user!.id, req.params.id);
      if (!character) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(character.gameInstance.gameKey);
      const body = updateCharacterInput.parse(req.body);
      const updated = await prisma.character.update({
        where: { id: character.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.catalogId !== undefined ? { catalogId: body.catalogId } : {}),
          ...(body.portraitUrl !== undefined ? { portraitUrl: body.portraitUrl } : {}),
          ...(body.doc !== undefined ? { doc: validateDoc(game, body.doc) as PrismaJson } : {}),
        },
      });
      return characterDto.parse(updated);
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
