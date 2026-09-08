import type { FastifyInstance } from "fastify";
import { BUILT_STATUSES, dashboardDto, getGame } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { getGameServerModule } from "../games/index.js";
import { listBanners, listEvents } from "../lib/timeline.js";
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
      include: { currencies: true, characters: { select: { id: true, catalogId: true, buildStatus: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Owned characters per profile, for the "X built / Y owned" analytic.
    const ownedRows = await prisma.ownership.groupBy({
      by: ["gameInstanceId"],
      where: { gameInstanceId: { in: instances.map((g) => g.id) }, kind: "character" },
      _count: true,
    });
    const ownedByInstance = new Map(ownedRows.map((r) => [r.gameInstanceId, r._count]));

    const tasks = await prisma.task.findMany({ where: { userId } });
    const ctx = await buildRegionContext(tasks);
    const enriched = tasks.map((t) => serializeTask(t, ctx, now));
    const byRef = new Map<string, typeof enriched>();
    for (const t of enriched) {
      const arr = byRef.get(t.refId) ?? [];
      arr.push(t);
      byRef.set(t.refId, arr);
    }

    const extras = await Promise.all(
      instances.map((gi) => getGameServerModule(gi.gameKey)?.dashboardExtras?.(gi).catch(() => undefined)),
    );

    const games = instances.map((gi, i) => {
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
        ownedCharacters: ownedByInstance.get(gi.id) ?? 0,
        // Distinct catalog characters marked good/perfect.
        builtCharacters: new Set(
          gi.characters.filter((c) => c.catalogId && BUILT_STATUSES.includes(c.buildStatus as never)).map((c) => c.catalogId),
        ).size,
        currencies: gi.currencies.map((c) => {
          const d = currencyByKey.get(c.key);
          return {
            key: c.key,
            label: d?.label ?? c.key,
            value: c.value,
            cap: d?.cap ?? null,
            regenPerHour: d?.regenPerHour ?? null,
            pullCost: d?.pullCost ?? null,
            pullLabel: d?.pullLabel ?? null,
          };
        }),
        dailies,
        nextReset: soonest ?? null,
        extras: extras[i],
      };
    });

    // Countdowns: active + upcoming banners/events across the installed games.
    const gameKeys = [...new Set(instances.map((gi) => gi.gameKey))];
    const [banners, events] = await Promise.all([
      listBanners(gameKeys, "current", now, 24),
      listEvents(gameKeys, "current", now, 24),
    ]);

    return dashboardDto.parse({
      games,
      // Top-level goals only — material subtasks live under their parent.
      goals: enriched.filter((t) => t.type === "goal" && !t.parentId),
      timeline: { banners, events },
    });
  });
}
