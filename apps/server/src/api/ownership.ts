import type { FastifyInstance } from "fastify";
import { ownershipDto, setOwnershipInput, weaponMetaSchema } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, getCatalog, loadInstance, type PrismaJson } from "./util.js";

/**
 * Which catalog entries a profile owns. Bulk toggles are validated against
 * the game's catalog so an ownership row can never point at a phantom id.
 */
export async function registerOwnershipRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    "/api/instances/:id/ownership",
    { preHandler: requireUser },
    async (req, reply) => {
      const gameInstance = await loadInstance(req.user!.id, req.params.id);
      if (!gameInstance) return reply.code(404).send({ error: "not_found" });
      const rows = await prisma.ownership.findMany({
        where: { gameInstanceId: gameInstance.id },
        orderBy: [{ kind: "asc" }, { catalogId: "asc" }],
      });
      return rows.map((row) => ownershipDto.parse(row));
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/instances/:id/ownership",
    { preHandler: requireUser },
    async (req, reply) => {
      const gameInstance = await loadInstance(req.user!.id, req.params.id);
      if (!gameInstance) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gameInstance.gameKey);
      const { items } = setOwnershipInput.parse(req.body);

      // A weapon's meta is its level and refinement, within limits.
      if (items.some((item) => item.kind === "weapon" && item.meta !== undefined && !weaponMetaSchema.safeParse(item.meta).success)) {
        return reply.code(400).send({ error: "bad_weapon_meta" });
      }

      const loadedCatalog = await getCatalog(game);
      if (loadedCatalog) {
        const unknown = items.filter((item) =>
          item.kind === "character"
            ? !loadedCatalog.index.characters.has(item.catalogId)
            : item.kind === "weapon"
              ? !loadedCatalog.index.weapons.has(item.catalogId)
              : false,
        );
        if (unknown.length) {
          return reply.code(400).send({
            error: "unknown_catalog_id",
            ids: unknown.map((unknownItem) => `${unknownItem.kind}:${unknownItem.catalogId}`).slice(0, 20),
          });
        }
      }

      await prisma.$transaction(
        items.map((item) => {
          const key = { gameInstanceId: gameInstance.id, kind: item.kind, catalogId: item.catalogId };
          if (!item.owned) return prisma.ownership.deleteMany({ where: key });
          const data = {
            ...(item.qty !== undefined ? { qty: item.qty } : {}),
            ...(item.meta !== undefined ? { meta: item.meta as PrismaJson } : {}),
          };
          return prisma.ownership.upsert({
            where: { gameInstanceId_kind_catalogId: key },
            create: { ...key, qty: item.qty ?? 1, meta: (item.meta ?? undefined) as PrismaJson | undefined },
            update: data,
          });
        }),
      );

      const rows = await prisma.ownership.findMany({
        where: { gameInstanceId: gameInstance.id },
        orderBy: [{ kind: "asc" }, { catalogId: "asc" }],
      });
      return rows.map((row) => ownershipDto.parse(row));
    },
  );
}
