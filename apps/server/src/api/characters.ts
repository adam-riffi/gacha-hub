import type { FastifyInstance } from "fastify";
import { Prisma } from "../generated/prisma/client.js";
import type { Character } from "../generated/prisma/client.js";
import { characterDto, createCharacterInput, updateCharacterInput, weaponHolder, type GameDefinition } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { migrateDoc } from "../lib/docMigrations.js";
import { requireUser } from "../auth/plugin.js";
import { cardStatsWrite, gameOrThrow, getCatalog, loadCharacter, loadInstance, numericKpis, validateDoc, type PrismaJson } from "./util.js";
import { syncHolders } from "./weapons.js";

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
      const gameInstance = await loadInstance(req.user!.id, req.params.id);
      if (!gameInstance) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gameInstance.gameKey);
      const rows = await prisma.character.findMany({
        where: { gameInstanceId: gameInstance.id },
        orderBy: { createdAt: "asc" },
      });
      const fresh = await Promise.all(rows.map((row) => upToDate(game, row)));
      return fresh.map((freshRow) => characterDto.parse(freshRow));
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
      const gameInstance = await loadInstance(req.user!.id, req.params.id);
      if (!gameInstance) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gameInstance.gameKey);
      const body = createCharacterInput.parse(req.body);

      let name = body.name;
      let seed: object = {};
      const loadedCatalog = await getCatalog(game);
      if (loadedCatalog) {
        if (!body.catalogId) return reply.code(400).send({ error: "catalog_id_required" });
        const entry = loadedCatalog.index.characters.get(body.catalogId);
        if (!entry) return reply.code(404).send({ error: "unknown_catalog_id" });
        name = name ?? entry.name;
        seed = (game.seedDoc?.(entry) as object) ?? {};
        // A build owns its character, unless it is only a try (round 9).
        if (body.own !== false) {
          await prisma.ownership.upsert({
            where: {
              gameInstanceId_kind_catalogId: { gameInstanceId: gameInstance.id, kind: "character", catalogId: entry.id },
            },
            create: { gameInstanceId: gameInstance.id, kind: "character", catalogId: entry.id, qty: 1 },
            update: {},
          });
        }
      } else if (!name) {
        return reply.code(400).send({ error: "name_required" });
      }

      const doc = validateDoc(game, {
        ...(game.emptyDoc() as object),
        ...seed,
        ...((body.doc as object) ?? {}),
      });
      // A unit's first build is its default.
      const siblings = body.catalogId ? await prisma.character.count({ where: { gameInstanceId: gameInstance.id, catalogId: body.catalogId } }) : 0;
      const created = await prisma.character.create({
        data: {
          gameInstanceId: gameInstance.id,
          catalogId: body.catalogId ?? null,
          isDefault: siblings === 0,
          name: name!,
          portraitUrl: body.portraitUrl ?? null,
          doc: doc as PrismaJson,
          docVersion: game.docVersion,
          ...(body.buildStatus ? { buildStatus: body.buildStatus } : {}),
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
      // The game's default targets come along, for the KPIs this build sets none for.
      return { ...characterDto.parse(fresh), gameKey: game.key, defaultTargets: (character.gameInstance.kpiTargets as Record<string, number> | null) ?? null };
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
      if (body.role && !game.manifest.kpis[body.role]) return reply.code(400).send({ error: "unknown_role" });
      const numeric = numericKpis(game);
      if (body.targets && Object.keys(body.targets).some((target) => !numeric.has(target))) return reply.code(400).send({ error: "unknown_kpi" });
      if (body.cardStats && new Set(body.cardStats).size < body.cardStats.length) return reply.code(400).send({ error: "duplicate_stat" });
      if (body.catalogId !== undefined) {
        const loadedCatalog = await getCatalog(game);
        if (loadedCatalog && body.catalogId && !loadedCatalog.index.characters.has(body.catalogId)) {
          return reply.code(404).send({ error: "unknown_catalog_id" });
        }
      }
      // A build holding a copy (round 5): the copy is this profile's and the same weapon, and takes the sheet's level and refinement.
      const doc = body.doc !== undefined ? (validateDoc(game, body.doc) as Record<string, unknown>) : undefined;
      const holder = weaponHolder(game);
      const held = doc && holder ? (doc[holder] as { copyId?: string; catalogId?: string; level?: number } & Record<string, unknown>) : undefined;
      let copy: { id: string; level: number; refinement: number } | null = null;
      if (held?.copyId) {
        const found = await prisma.weaponCopy.findFirst({ where: { id: held.copyId, gameInstanceId: character.gameInstanceId } });
        if (!found || found.catalogId !== (held.catalogId ?? null)) return reply.code(400).send({ error: "copy_mismatch" });
        const dupe = game.manifest.dupes.weapon!.field.split(".")[1]!;
        copy = await prisma.weaponCopy.update({ where: { id: found.id }, data: { level: held.level ?? found.level, refinement: typeof held[dupe] === "number" ? (held[dupe] as number) : found.refinement } });
      }
      if (body.isDefault) {
        await prisma.character.updateMany({ where: { gameInstanceId: character.gameInstanceId, catalogId: character.catalogId, NOT: { id: character.id } }, data: { isDefault: false } });
      }
      if (body.cardStats !== undefined) {
        const write = cardStatsWrite(body.cardStats, body.cardStatsOrder);
        await prisma.character.updateMany({ where: { id: character.id, ...write.where }, data: write.data });
      }
      const updated = await prisma.character.update({
        where: { id: character.id },
        data: {
          ...(body.isDefault ? { isDefault: true } : {}),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.catalogId !== undefined ? { catalogId: body.catalogId } : {}),
          ...(body.portraitUrl !== undefined ? { portraitUrl: body.portraitUrl } : {}),
          ...(doc !== undefined ? { doc: doc as PrismaJson, docVersion: game.docVersion } : {}),
          ...(body.buildStatus !== undefined ? { buildStatus: body.buildStatus } : {}),
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.targets !== undefined ? { targets: body.targets === null ? Prisma.DbNull : (body.targets as PrismaJson) } : {}),
          ...(body.misc !== undefined ? { misc: body.misc === null ? Prisma.DbNull : body.misc } : {}),
        },
      });
      if (copy) await syncHolders(game, character.gameInstanceId, copy.id, copy, character.id);
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
