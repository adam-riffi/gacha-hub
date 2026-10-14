import type { FastifyInstance } from "fastify";
import { farmToday, farmTodayDto, gameWeekday, getGame, type FarmUnit } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { getCatalog, regionForInstance } from "./util.js";
import { buildRegionContext, serializeTask } from "./tasks.js";

/**
 * Farm today (WIREFRAMES.md A3): per awake profile, on its game day, the
 * rotating materials open for each farming goal (Plan farming's "Farm X"
 * with its material subtasks), what any day farms, and the weeklies left.
 */
export async function registerFarmTodayRoutes(app: FastifyInstance) {
  app.get("/api/farm-today", { preHandler: requireUser }, async (req) => {
    const now = new Date();
    const instances = await prisma.gameInstance.findMany({ where: { userId: req.user!.id, sleeping: false }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
    const rows = await prisma.task.findMany({ where: { userId: req.user!.id, scope: "game", backlog: false, refId: { in: instances.map((instance) => instance.id) } } });
    const regionContext = await buildRegionContext(rows);
    const tasks = rows.map((row) => ({ row: row, dto: serializeTask(row, regionContext, now) }));

    const out = [];
    for (const gameInstance of instances) {
      const game = getGame(gameInstance.gameKey);
      if (!game) continue;
      const weekday = gameWeekday(regionForInstance(game, gameInstance), now);
      const materials = (await getCatalog(game))?.index.materials;
      const mine = tasks.filter((task) => task.row.refId === gameInstance.id);
      const goals = mine
        // Linked goals too (round 6): each farms its own materials.
        .filter((task) => task.row.type === "goal" && !task.row.materialId)
        .map((goalTask) => {
          const origin = goalTask.row.origin as { kind?: FarmUnit["kind"]; catalogId?: string } | null;
          return {
            owner: goalTask.row.title.replace(/^Farm /, ""),
            unit: origin?.kind && origin.catalogId ? { kind: origin.kind, catalogId: origin.catalogId } : null,
            materials: mine
              .filter((step) => step.row.parentId === goalTask.row.id && step.row.materialId)
              .map((step) => ({ material: materials?.get(step.row.materialId!) ?? { id: step.row.materialId!, name: step.row.materialId!, category: "" }, missing: (step.row.target ?? 0) - step.dto.progress })),
          };
        });
      const weekly = mine.filter((task) => task.row.type === "recurring" && task.row.cadence === "weekly" && !task.dto.doneThisCycle);
      const lines = [
        ...farmToday(goals, weekday),
        ...(weekly.length === 1 ? [{ kind: "weekly" as const, text: `${weekly[0]!.row.title} left` }] : weekly.length > 1 ? [{ kind: "weekly" as const, text: `${weekly.length} weekly tasks left` }] : []),
      ];
      const week = [1, 2, 3, 4, 5, 6, 7].map((dayNumber) => ({ weekday: dayNumber, lines: farmToday(goals, dayNumber).filter((line) => line.kind === "domain") }));
      out.push({ gameKey: gameInstance.gameKey, instanceId: gameInstance.id, weekday, lines, week });
    }
    return farmTodayDto.parse(out);
  });
}
