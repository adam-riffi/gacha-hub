import type { FastifyInstance } from "fastify";
import { ownershipDto, setOwnershipInput } from "@gacha/shared";
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
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const rows = await prisma.ownership.findMany({
        where: { gameInstanceId: gi.id },
        orderBy: [{ kind: "asc" }, { catalogId: "asc" }],
      });
      return rows.map((r) => ownershipDto.parse(r));
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/instances/:id/ownership",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const { items } = setOwnershipInput.parse(req.body);

      const cat = await getCatalog(game);
      if (cat) {
        const unknown = items.filter((i) =>
          i.kind === "character"
            ? !cat.index.characters.has(i.catalogId)
            : i.kind === "weapon"
              ? !cat.index.weapons.has(i.catalogId)
              : false,
        );
        if (unknown.length) {
          return reply.code(400).send({
            error: "unknown_catalog_id",
            ids: unknown.map((u) => `${u.kind}:${u.catalogId}`).slice(0, 20),
          });
        }
      }

      await prisma.$transaction(
        items.map((i) => {
          const key = { gameInstanceId: gi.id, kind: i.kind, catalogId: i.catalogId };
          if (!i.owned) return prisma.ownership.deleteMany({ where: key });
          const data = {
            ...(i.qty !== undefined ? { qty: i.qty } : {}),
            ...(i.meta !== undefined ? { meta: i.meta as PrismaJson } : {}),
          };
          return prisma.ownership.upsert({
            where: { gameInstanceId_kind_catalogId: key },
            create: { ...key, qty: i.qty ?? 1, meta: (i.meta ?? undefined) as PrismaJson | undefined },
            update: data,
          });
        }),
      );

      const rows = await prisma.ownership.findMany({
        where: { gameInstanceId: gi.id },
        orderBy: [{ kind: "asc" }, { catalogId: "asc" }],
      });
      return rows.map((r) => ownershipDto.parse(r));
    },
  );
}
