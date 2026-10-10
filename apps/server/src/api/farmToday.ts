import type { FastifyInstance } from "fastify";
import { farmToday, farmTodayDto, gameWeekday, getGame } from "@gacha/shared";
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
    const rows = await prisma.task.findMany({ where: { userId: req.user!.id, scope: "game", backlog: false, refId: { in: instances.map((i) => i.id) } } });
    const ctx = await buildRegionContext(rows);
    const tasks = rows.map((t) => ({ row: t, dto: serializeTask(t, ctx, now) }));

    const out = [];
    for (const gi of instances) {
      const game = getGame(gi.gameKey);
      if (!game) continue;
      const weekday = gameWeekday(regionForInstance(game, gi), now);
      const materials = (await getCatalog(game))?.index.materials;
      const mine = tasks.filter((t) => t.row.refId === gi.id);
      const goals = mine
        .filter((t) => t.row.type === "goal" && !t.row.parentId && !t.row.materialId)
        .map((p) => ({
          owner: p.row.title.replace(/^Farm /, ""),
          materials: mine
            .filter((c) => c.row.parentId === p.row.id && c.row.materialId)
            .map((c) => ({ material: materials?.get(c.row.materialId!) ?? { name: c.row.materialId!, category: "" }, missing: (c.row.target ?? 0) - c.dto.progress })),
        }));
      const weekly = mine.filter((t) => t.row.type === "recurring" && t.row.cadence === "weekly" && !t.dto.doneThisCycle);
      const lines = [
        ...farmToday(goals, weekday),
        ...(weekly.length === 1 ? [{ kind: "weekly" as const, text: `${weekly[0]!.row.title} left` }] : weekly.length > 1 ? [{ kind: "weekly" as const, text: `${weekly.length} weekly tasks left` }] : []),
      ];
      out.push({ gameKey: gi.gameKey, instanceId: gi.id, weekday, lines });
    }
    return farmTodayDto.parse(out);
  });
}
