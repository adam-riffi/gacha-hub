import type { FastifyInstance } from "fastify";
import { setWishlistInput, wishlistItemDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, getCatalog, loadInstance } from "./util.js";

/** The profile's wishlist (WIREFRAMES.md G4): units wanted, in the order they were added. */
export async function registerWishlistRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/wishlist", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const rows = await prisma.wishlistItem.findMany({ where: { gameInstanceId: gi.id }, orderBy: { createdAt: "asc" } });
    return rows.map((r) => wishlistItemDto.parse(r));
  });

  app.put<{ Params: { id: string } }>("/api/instances/:id/wishlist", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const { kind, catalogId, wished } = setWishlistInput.parse(req.body);
    const index = (await getCatalog(gameOrThrow(gi.gameKey)))?.index;
    if (index && !(kind === "character" ? index.characters : index.weapons).has(catalogId)) return reply.code(404).send({ error: "unknown_catalog_id" });
    const key = { gameInstanceId_kind_catalogId: { gameInstanceId: gi.id, kind, catalogId } };
    if (wished) await prisma.wishlistItem.upsert({ where: key, create: { gameInstanceId: gi.id, kind, catalogId }, update: {} });
    else await prisma.wishlistItem.deleteMany({ where: { gameInstanceId: gi.id, kind, catalogId } });
    return { ok: true };
  });
}
