import type { FastifyInstance } from "fastify";
import { getGame } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { buildRegionContext, serializeTask } from "./tasks.js";

/**
 * Cross-game overview: each account with currencies (labels/caps from the game
 * module), its recurring tasks (done + next-reset), plus active farming goals.
 */
export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", { preHandler: requireUser }, async (req) => {
    const userId = req.user!.id;
    const now = new Date();

    const instances = await prisma.gameInstance.findMany({
      where: { userId },
      include: {
        accounts: {
          include: { currencies: true, characters: { select: { id: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const tasks = await prisma.task.findMany({ where: { userId } });
    const ctx = await buildRegionContext(tasks);
    const enriched = tasks.map((t) => serializeTask(t, ctx, now));
    const byRef = new Map<string, ReturnType<typeof serializeTask>[]>();
    for (const t of enriched) {
      const arr = byRef.get(t.refId) ?? [];
      arr.push(t);
      byRef.set(t.refId, arr);
    }

    const gamesOut = instances.map((gi) => {
      const game = getGame(gi.gameKey);
      const currencyByKey = new Map((game?.currencies ?? []).map((c) => [c.key, c]));
      const accounts = gi.accounts.map((acc) => {
        const accTasks = byRef.get(acc.id) ?? [];
        const dailies = accTasks.filter(
          (t) => t.type === "recurring" && "doneThisCycle" in t,
        );
        const soonest = dailies
          .map((d) => ("nextReset" in d ? d.nextReset : null))
          .filter((x): x is Date => Boolean(x))
          .sort((a, b) => a.getTime() - b.getTime())[0];
        return {
          id: acc.id,
          label: acc.label,
          regionKey: acc.regionKey,
          characterCount: acc.characters.length,
          currencies: acc.currencies.map((c) => {
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
      return {
        instanceId: gi.id,
        gameKey: gi.gameKey,
        name: game?.name ?? gi.gameKey,
        accent: game?.accent ?? "#7c8cff",
        accounts,
      };
    });

    const goals = enriched.filter((t) => t.type === "goal");
    return { games: gamesOut, goals };
  });
}
