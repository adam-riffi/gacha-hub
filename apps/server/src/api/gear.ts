import type { FastifyInstance } from "fastify";
import {
  GENSHIN_ARTIFACT_SLOTS,
  equipGearInput,
  gearPieceDto,
  gearPieceInput,
  unequipGearInput,
  type GameDefinition,
} from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { migrateDoc } from "../lib/docMigrations.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, loadCharacter, loadInstance, validateDoc, type PrismaJson } from "./util.js";

/**
 * Games whose builds support the bag ↔ build swap: the doc key that holds gear
 * (keyed by slot) and the valid slots. Genshin first; others add an entry.
 */
const GEAR: Record<string, { docKey: string; slots: readonly string[] }> = {
  genshin: { docKey: "artifacts", slots: GENSHIN_ARTIFACT_SLOTS.map((s) => s.key) },
};

type DocPiece = { setName?: string; mainStat?: string; level?: number; substats?: unknown[] };
const hasData = (p?: DocPiece) => Boolean(p && (p.setName || p.mainStat || p.level || p.substats?.length));
const toDocPiece = (p: { setName: string; mainStat: string; level: number; substats: unknown[] }) => ({
  ...(p.setName ? { setName: p.setName } : {}),
  ...(p.mainStat ? { mainStat: p.mainStat } : {}),
  level: p.level,
  substats: p.substats,
});
const toBagFields = (p: DocPiece) => ({
  setName: p.setName ?? "",
  mainStat: p.mainStat ?? "",
  level: p.level ?? 0,
  substats: (p.substats ?? []) as PrismaJson,
});

/** The build's gear map, on a doc migrated to the game's current shape. */
function gearOf(game: GameDefinition, character: { doc: unknown; docVersion: number }, docKey: string) {
  const { doc } = migrateDoc(game, character.doc, character.docVersion);
  const d = (doc ?? {}) as Record<string, unknown>;
  return { doc: d, gear: { ...((d[docKey] ?? {}) as Record<string, DocPiece>) } };
}

function ownedPiece(userId: string, id: string) {
  return prisma.gearPiece.findFirst({ where: { id, gameInstance: { userId } }, include: { gameInstance: true } });
}

export async function registerGearRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/gear", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const rows = await prisma.gearPiece.findMany({ where: { gameInstanceId: gi.id }, orderBy: { createdAt: "desc" } });
    return rows.map((r) => gearPieceDto.parse(r));
  });

  app.post<{ Params: { id: string } }>("/api/instances/:id/gear", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const spec = GEAR[gi.gameKey];
    if (!spec) return reply.code(400).send({ error: "unsupported_game" });
    const body = gearPieceInput.parse(req.body);
    if (!spec.slots.includes(body.slot)) return reply.code(400).send({ error: "unknown_slot" });
    const row = await prisma.gearPiece.create({
      data: { gameInstanceId: gi.id, ...body, substats: body.substats as PrismaJson },
    });
    return reply.code(201).send(gearPieceDto.parse(row));
  });

  app.put<{ Params: { id: string } }>("/api/gear/:id", { preHandler: requireUser }, async (req, reply) => {
    const piece = await ownedPiece(req.user!.id, req.params.id);
    if (!piece) return reply.code(404).send({ error: "not_found" });
    const body = gearPieceInput.parse(req.body);
    if (!GEAR[piece.gameInstance.gameKey]?.slots.includes(body.slot)) return reply.code(400).send({ error: "unknown_slot" });
    const row = await prisma.gearPiece.update({
      where: { id: piece.id },
      data: { ...body, substats: body.substats as PrismaJson },
    });
    return gearPieceDto.parse(row);
  });

  app.delete<{ Params: { id: string } }>("/api/gear/:id", { preHandler: requireUser }, async (req, reply) => {
    const piece = await ownedPiece(req.user!.id, req.params.id);
    if (!piece) return reply.code(404).send({ error: "not_found" });
    await prisma.gearPiece.delete({ where: { id: piece.id } });
    return { ok: true };
  });

  /** Move a bag piece onto a build; whatever it replaces drops into the bag. */
  app.post<{ Params: { id: string } }>("/api/gear/:id/equip", { preHandler: requireUser }, async (req, reply) => {
    const userId = req.user!.id;
    const piece = await ownedPiece(userId, req.params.id);
    if (!piece) return reply.code(404).send({ error: "not_found" });
    const { characterId } = equipGearInput.parse(req.body);
    const character = await loadCharacter(userId, characterId);
    if (!character || character.gameInstanceId !== piece.gameInstanceId) {
      return reply.code(404).send({ error: "character_not_found" });
    }
    const game = gameOrThrow(piece.gameInstance.gameKey);
    const spec = GEAR[game.key];
    if (!spec) return reply.code(400).send({ error: "unsupported_game" });

    const { doc, gear } = gearOf(game, character, spec.docKey);
    const previous = gear[piece.slot];
    gear[piece.slot] = toDocPiece({ ...piece, substats: (piece.substats ?? []) as unknown[] });
    const next = validateDoc(game, { ...doc, [spec.docKey]: gear }) as PrismaJson;

    await prisma.$transaction([
      prisma.character.update({ where: { id: character.id }, data: { doc: next, docVersion: game.docVersion } }),
      prisma.gearPiece.delete({ where: { id: piece.id } }),
      ...(hasData(previous)
        ? [prisma.gearPiece.create({ data: { gameInstanceId: piece.gameInstanceId, slot: piece.slot, ...toBagFields(previous!) } })]
        : []),
    ]);
    return { ok: true };
  });

  /** Take a build's piece off into the bag. */
  app.post<{ Params: { id: string } }>("/api/characters/:id/unequip", { preHandler: requireUser }, async (req, reply) => {
    const character = await loadCharacter(req.user!.id, req.params.id);
    if (!character) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(character.gameInstance.gameKey);
    const spec = GEAR[game.key];
    if (!spec) return reply.code(400).send({ error: "unsupported_game" });
    const { slot } = unequipGearInput.parse(req.body);

    const { doc, gear } = gearOf(game, character, spec.docKey);
    const current = gear[slot];
    if (!hasData(current)) return reply.code(400).send({ error: "empty_slot" });
    delete gear[slot];
    const next = validateDoc(game, { ...doc, [spec.docKey]: gear }) as PrismaJson;

    await prisma.$transaction([
      prisma.character.update({ where: { id: character.id }, data: { doc: next, docVersion: game.docVersion } }),
      prisma.gearPiece.create({ data: { gameInstanceId: character.gameInstanceId, slot, ...toBagFields(current!) } }),
    ]);
    return { ok: true };
  });
}
