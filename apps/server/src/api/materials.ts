import type { FastifyInstance } from "fastify";
import { materialNeedDto, materialStockDto, setMaterialStockInput } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { gameWeekday } from "../lib/availability.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, getCatalog, loadInstance, regionForInstance } from "./util.js";
import { describeMaterials } from "./planning.js";

/** A profile's material stock, and what its active farming goals still need. */
export async function registerMaterialRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    "/api/instances/:id/materials",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const rows = await prisma.materialStock.findMany({
        where: { gameInstanceId: gi.id },
        orderBy: { materialId: "asc" },
      });
      return rows.map((r) => materialStockDto.parse(r));
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/instances/:id/materials",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const { items } = setMaterialStockInput.parse(req.body);
      const cat = await getCatalog(game);
      if (cat) {
        const unknown = items.filter((i) => !cat.index.materials.has(i.materialId)).map((i) => i.materialId);
        if (unknown.length) return reply.code(400).send({ error: "unknown_material_id", ids: unknown.slice(0, 20) });
      }
      await prisma.$transaction(
        items.map((i) =>
          i.qty === 0
            ? prisma.materialStock.deleteMany({ where: { gameInstanceId: gi.id, materialId: i.materialId } })
            : prisma.materialStock.upsert({
                where: { gameInstanceId_materialId: { gameInstanceId: gi.id, materialId: i.materialId } },
                create: { gameInstanceId: gi.id, materialId: i.materialId, qty: i.qty },
                update: { qty: i.qty },
              }),
        ),
      );
      const rows = await prisma.materialStock.findMany({
        where: { gameInstanceId: gi.id },
        orderBy: { materialId: "asc" },
      });
      return rows.map((r) => materialStockDto.parse(r));
    },
  );

  // Need per material = Σ target over material goals (raw totals); `have` is
  // the stock, so the client's "missing" is need − have, subtracted once.
  app.get<{ Params: { id: string } }>(
    "/api/instances/:id/materials/needed",
    { preHandler: requireUser },
    async (req, reply) => {
      const gi = await loadInstance(req.user!.id, req.params.id);
      if (!gi) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gi.gameKey);
      const [tasks, stockRows, cat] = await Promise.all([
        prisma.task.findMany({
          where: { userId: req.user!.id, scope: "game", refId: gi.id, type: "goal", materialId: { not: null } },
        }),
        prisma.materialStock.findMany({ where: { gameInstanceId: gi.id } }),
        getCatalog(game),
      ]);
      const needed = new Map<string, number>();
      for (const t of tasks) {
        const total = Math.max(0, Math.round(t.target ?? 0));
        if (total > 0) needed.set(t.materialId!, (needed.get(t.materialId!) ?? 0) + total);
      }
      const have = new Map(stockRows.map((r) => [r.materialId, r.qty]));
      const weekday = gameWeekday(regionForInstance(game, gi));
      const described = cat ? describeMaterials(cat, needed.keys(), weekday) : {};
      return [...needed.entries()]
        .map(([materialId, n]) =>
          materialNeedDto.parse({
            materialId,
            needed: n,
            have: have.get(materialId) ?? 0,
            material: described[materialId] ?? null,
          }),
        )
        .sort((a, b) => b.needed - a.needed);
    },
  );
}
