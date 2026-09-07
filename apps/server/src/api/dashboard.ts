import type { FastifyInstance } from "fastify";
import { dashboardDto, getGame } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { buildRegionContext, serializeTask } from "./tasks.js";

/**
 * Cross-game overview: one card per profile with currencies (labels/caps from
 * the game module), recurring tasks (done + next reset), plus active goals.
 */
export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", { preHandler: requireUser }, async (req) => {
    const userId = req.user!.id;
    const now = new Date();

    const instances = await prisma.gameInstance.findMany({
      where: { userId },
      include: { currencies: true, characters: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    });

    const tasks = await prisma.task.findMany({ where: { userId } });
    const ctx = await buildRegionContext(tasks);
    const enriched = tasks.map((t) => serializeTask(t, ctx, now));
    const byRef = new Map<string, typeof enriched>();
    for (const t of enriched) {
      const arr = byRef.get(t.refId) ?? [];
      arr.push(t);
      byRef.set(t.refId, arr);
    }

    const games = instances.map((gi) => {
      const game = getGame(gi.gameKey);
      const currencyByKey = new Map((game?.currencies ?? []).map((c) => [c.key, c]));
      const dailies = (byRef.get(gi.id) ?? []).filter((t) => t.type === "recurring");
      const soonest = dailies
        .map((d) => d.nextReset)
        .filter((x): x is string => Boolean(x))
        .sort()[0];
      return {
        instanceId: gi.id,
        gameKey: gi.gameKey,
        name: game?.name ?? gi.gameKey,
        accent: game?.accent ?? "#7c8cff",
        regionKey: gi.regionKey,
        characterCount: gi.characters.length,
        currencies: gi.currencies.map((c) => {
          const d = currencyByKey.get(c.key);
          return {
            key: c.key,
            label: d?.label ?? c.key,
            value: c.value,
            cap: d?.cap ?? null,
            regenPerHour: d?.regenPerHour ?? null,
          };
        }),
        dailies,
        nextReset: soonest ?? null,
      };
    });

    return dashboardDto.parse({ games, goals: enriched.filter((t) => t.type === "goal") });
  });
}
