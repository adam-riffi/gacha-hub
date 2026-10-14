import type { FastifyInstance } from "fastify";
import { materialNeedDto, materialStockDto, setMaterialStockInput } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { gameWeekday } from "@gacha/shared";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, getCatalog, loadInstance, regionForInstance } from "./util.js";
import { describeMaterials } from "./planning.js";

/** A profile's material stock, and what its active farming goals still need. */
export async function registerMaterialRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    "/api/instances/:id/materials",
    { preHandler: requireUser },
    async (req, reply) => {
      const gameInstance = await loadInstance(req.user!.id, req.params.id);
      if (!gameInstance) return reply.code(404).send({ error: "not_found" });
      const rows = await prisma.materialStock.findMany({
        where: { gameInstanceId: gameInstance.id },
        orderBy: { materialId: "asc" },
      });
      return rows.map((row) => materialStockDto.parse(row));
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/instances/:id/materials",
    { preHandler: requireUser },
    async (req, reply) => {
      const gameInstance = await loadInstance(req.user!.id, req.params.id);
      if (!gameInstance) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gameInstance.gameKey);
      const { items } = setMaterialStockInput.parse(req.body);
      const loadedCatalog = await getCatalog(game);
      if (loadedCatalog) {
        const unknown = items.filter((item) => !loadedCatalog.index.materials.has(item.materialId)).map((item) => item.materialId);
        if (unknown.length) return reply.code(400).send({ error: "unknown_material_id", ids: unknown.slice(0, 20) });
      }
      await prisma.$transaction(
        items.map((item) =>
          item.qty === 0
            ? prisma.materialStock.deleteMany({ where: { gameInstanceId: gameInstance.id, materialId: item.materialId } })
            : prisma.materialStock.upsert({
                where: { gameInstanceId_materialId: { gameInstanceId: gameInstance.id, materialId: item.materialId } },
                create: { gameInstanceId: gameInstance.id, materialId: item.materialId, qty: item.qty },
                update: { qty: item.qty },
              }),
        ),
      );
      const rows = await prisma.materialStock.findMany({
        where: { gameInstanceId: gameInstance.id },
        orderBy: { materialId: "asc" },
      });
      return rows.map((row) => materialStockDto.parse(row));
    },
  );

  // Need per material = Σ target over material goals (raw totals); `have` is
  // the stock, so the client's "missing" is need − have, subtracted once.
  app.get<{ Params: { id: string } }>(
    "/api/instances/:id/materials/needed",
    { preHandler: requireUser },
    async (req, reply) => {
      const gameInstance = await loadInstance(req.user!.id, req.params.id);
      if (!gameInstance) return reply.code(404).send({ error: "not_found" });
      const game = gameOrThrow(gameInstance.gameKey);
      const [tasks, stockRows, cat] = await Promise.all([
        prisma.task.findMany({
          where: { userId: req.user!.id, scope: "game", refId: gameInstance.id, type: "goal", materialId: { not: null } },
        }),
        prisma.materialStock.findMany({ where: { gameInstanceId: gameInstance.id } }),
        getCatalog(game),
      ]);
      const needed = new Map<string, number>();
      for (const task of tasks) {
        const total = Math.max(0, Math.round(task.target ?? 0));
        if (total > 0) needed.set(task.materialId!, (needed.get(task.materialId!) ?? 0) + total);
      }
      const have = new Map(stockRows.map((stockRow) => [stockRow.materialId, stockRow.qty]));
      const weekday = gameWeekday(regionForInstance(game, gameInstance), new Date());
      const described = cat ? describeMaterials(cat, needed.keys(), weekday) : {};
      return [...needed.entries()]
        .map(([materialId, neededCount]) =>
          materialNeedDto.parse({
            materialId,
            needed: neededCount,
            have: have.get(materialId) ?? 0,
            material: described[materialId] ?? null,
          }),
        )
        .sort((first, second) => second.needed - first.needed);
    },
  );
}
