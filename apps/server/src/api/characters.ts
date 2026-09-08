import type { FastifyInstance } from "fastify";
import type { Character } from "@prisma/client";
import { characterDto, createCharacterInput, updateCharacterInput, type GameDefinition } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { migrateDoc } from "../lib/docMigrations.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, getCatalog, loadCharacter, loadInstance, validateDoc, type PrismaJson } from "./util.js";

/** Bring a stored document up to the game's current shape, persisting lazily. */
async function upToDate(game: GameDefinition, character: Character): Promise<Character> {
  const { doc, version, changed } = migrateDoc(game, character.doc, character.docVersion);
  if (!changed) return character;
  return prisma.character.update({
    where: { id: character.id },
    data: { doc: doc as PrismaJson, docVersion: version },
  });
}

export async function registerCharacterRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    "/api/instances/:id/characters",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const rows = await prisma.character.findMany({
        where: { gameInstanceId: gi.id },
        orderBy: { createdAt: "asc" },
      });
      const fresh = await Promise.all(rows.map((r) => upToDate(game, r)));
      return fresh.map((r) => characterDto.parse(r));
    },
  );

  /**
   * Create a build. For games with a catalog the entry is required: the name
   * defaults to the catalog name, the doc is seeded from the entry (element,
   * path…), and the character is marked owned. Games without a catalog take
   * a free-form name.
   */
  app.post<{ Params: { id: string } }>(
    "/api/instances/:id/characters",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const body = createCharacterInput.parse(req.body);

      let name = body.name;
      let seed: object = {};
      const cat = await getCatalog(game);
      if (cat) {
        if (!body.catalogId) return reply.code(400).send({ error: "catalog_id_required" });
        const entry = cat.index.characters.get(body.catalogId);
        if (!entry) return reply.code(404).send({ error: "unknown_catalog_id" });
        name = name ?? entry.name;
        seed = (game.seedDoc?.(entry) as object) ?? {};
        await prisma.ownership.upsert({
          where: {
            gameInstanceId_kind_catalogId: { gameInstanceId: gi.id, kind: "character", catalogId: entry.id },
          },
          create: { gameInstanceId: gi.id, kind: "character", catalogId: entry.id, qty: 1 },
          update: {},
        });
      } else if (!name) {
        return reply.code(400).send({ error: "name_required" });
      }

      const doc = validateDoc(game, {
        ...(game.emptyDoc() as object),
        ...seed,
        ...((body.doc as object) ?? {}),
      });
      const created = await prisma.character.create({
        data: {
          gameInstanceId: gi.id,
          catalogId: body.catalogId ?? null,
          name: name!,
          portraitUrl: body.portraitUrl ?? null,
          doc: doc as PrismaJson,
          docVersion: game.docVersion,
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
      const game = gameOrThrow(character.gameInstance.gameKey);
      const fresh = await upToDate(game, character);
      return { ...characterDto.parse(fresh), gameKey: game.key };
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
      if (body.catalogId !== undefined) {
        const cat = await getCatalog(game);
        if (cat && body.catalogId && !cat.index.characters.has(body.catalogId)) {
          return reply.code(404).send({ error: "unknown_catalog_id" });
        }
      }
      const updated = await prisma.character.update({
        where: { id: character.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.catalogId !== undefined ? { catalogId: body.catalogId } : {}),
          ...(body.portraitUrl !== undefined ? { portraitUrl: body.portraitUrl } : {}),
          ...(body.doc !== undefined
            ? { doc: validateDoc(game, body.doc) as PrismaJson, docVersion: game.docVersion }
            : {}),
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
