import type { FastifyInstance, FastifyRequest } from "fastify";
import { artSlots, gameList, type ArtSlot } from "@gacha/shared";
import { requireAdmin, requireUser } from "../auth/plugin.js";
import { IMAGE_TYPES, storeImage } from "../lib/images.js";
import { prisma } from "../lib/prisma.js";
import { getCatalog } from "./util.js";

const distinct = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value) && value !== "None"))].sort();

/** Every game's slots, its catalog's elements and weapon types included. */
async function allSlots(): Promise<ArtSlot[]> {
  const perGame = await Promise.all(
    gameList.map(async (game) => {
      const characters = (await getCatalog(game))?.catalog.characters ?? [];
      return artSlots(game, { elements: distinct(characters.map((character) => character.tag)), weaponTypes: distinct(characters.map((character) => character.weaponType)) });
    }),
  );
  return perGame.flat();
}

const slotKey = (req: FastifyRequest) => (req.params as { "*": string })["*"];
const writes = { preHandler: requireAdmin, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } };

/**
 * The owner's pictures for the art slots (Georges, 2026-10-17: "an exhaustive list of assets you need"): the list with
 * whether a source has each and the owner's upload, if any; an upload or a removal per slot, owner only and audited.
 */
export async function registerArtRoutes(app: FastifyInstance) {
  app.get("/api/art", { preHandler: requireUser }, async () => {
    const uploads = new Map((await prisma.artSlot.findMany()).map((row) => [row.key, row.url]));
    return { slots: (await allSlots()).map((slot) => ({ ...slot, url: uploads.get(slot.key) ?? null })) };
  });

  app.put("/api/art/*", writes, async (req, reply) => {
    const key = slotKey(req);
    if (!(await allSlots()).some((slot) => slot.key === key)) return reply.code(404).send({ error: "not_found" });
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "no_file" });
    if (!IMAGE_TYPES.has(data.mimetype)) return reply.code(415).send({ error: "unsupported_type" });
    const fileBuffer = await data.toBuffer();
    if (data.file.truncated) return reply.code(413).send({ error: "file_too_large" });
    const url = await storeImage(fileBuffer, data.mimetype);
    await prisma.$transaction([
      prisma.artSlot.upsert({ where: { key }, create: { key, url }, update: { url } }),
      prisma.auditLog.create({ data: { actorUserId: req.user!.id, action: "set", targetKind: "art", targetKey: key } }),
    ]);
    return { url };
  });

  app.delete("/api/art/*", writes, async (req) => {
    const key = slotKey(req);
    await prisma.$transaction([
      prisma.artSlot.deleteMany({ where: { key } }),
      prisma.auditLog.create({ data: { actorUserId: req.user!.id, action: "clear", targetKind: "art", targetKey: key } }),
    ]);
    return { ok: true };
  });
}
