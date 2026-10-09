import type { FastifyInstance } from "fastify";
import { BUILT_STATUSES, dashboardDto, getGame, pityState } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { getGameServerModule } from "../games/index.js";
import { listBanners, listEvents, withFeaturedDetails } from "../lib/timeline.js";
import { buildRegionContext, serializeTask } from "./tasks.js";
import { allCurrencies } from "../lib/currencies.js";
import { staminaProjection } from "../lib/regen.js";
import { getCatalog } from "./util.js";

const DAY = 86_400_000;

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
    const gearRows = await prisma.gearPiece.groupBy({
      by: ["gameInstanceId"],
      where: { gameInstanceId: { in: instances.map((g) => g.id) } },
      _count: true,
    });
    const gearByInstance = new Map(gearRows.map((r) => [r.gameInstanceId, r._count]));
    // Pull entries in order, for pity per banner (derived, ADR 0002).
    const pullRows = await prisma.pullEntry.findMany({
      where: { gameInstanceId: { in: instances.map((g) => g.id) } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { gameInstanceId: true, bannerKey: true, count: true, fiveStar: true, featured: true, createdAt: true },
    });
    // Catalogs are cached per process after the first load.
    const catalogs = new Map(
      await Promise.all(
        [...new Set(instances.map((gi) => gi.gameKey))].map(async (k) => {
          const game = getGame(k);
          return [k, game ? await getCatalog(game) : null] as const;
        }),
      ),
    );

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
      // The game's own recurring items are the ones it seeds (matched by title, as the restore route does).
      const builtIn = new Set((game?.defaultTasks ?? []).map((t) => t.title.toLowerCase()));
      const tally = (cadence: string, own: boolean) => {
        const mine = dailies.filter((t) => (t.cadence ?? "daily") === cadence && builtIn.has(t.title.toLowerCase()) === own);
        return { done: mine.filter((t) => t.doneThisCycle).length, total: mine.length };
      };
      return {
        instanceId: gi.id,
        gameKey: gi.gameKey,
        name: game?.name ?? gi.gameKey,
        accent: game?.accent ?? "#7c8cff",
        regionKey: gi.regionKey,
        sleeping: gi.sleeping,
        characterCount: gi.characters.length,
        ownedCharacters: ownedByInstance.get(gi.id) ?? 0,
        catalogCharacters: catalogs.get(gi.gameKey)?.catalog.characters.length ?? null,
        gearPieces: gearByInstance.get(gi.id) ?? 0,
        // Distinct catalog characters marked good/perfect.
        builtCharacters: new Set(
          gi.characters.filter((c) => c.catalogId && BUILT_STATUSES.includes(c.buildStatus as never)).map((c) => c.catalogId),
        ).size,
        currencies: (game ? allCurrencies(game.currencies, gi.currencies, gi.createdAt) : gi.currencies).map((c) => {
          const d = currencyByKey.get(c.key);
          return {
            key: c.key,
            label: d?.label ?? c.key,
            value: c.value,
            cap: d?.cap ?? null,
            regenPerHour: d?.regenPerHour ?? null,
            pullCost: d?.pullCost ?? null,
            pullLabel: d?.pullLabel ?? null,
            standardOnly: d?.standardOnly ?? false,
          };
        }),
        dailies,
        nextReset: soonest ?? null,
        extras: extras[i],
        pity: (game?.pullBanners ?? []).map((rules) => {
          const s = pityState(pullRows.filter((p) => p.gameInstanceId === gi.id && p.bannerKey === rules.key), rules);
          return { key: rules.key, label: rules.label, pity: s.pity, hardPity: rules.hardPity, guaranteed: s.guaranteed };
        }),
        stamina: game ? staminaProjection(game, gi.currencies, now) : null,
        pullLog: pullRows
          .filter((p) => p.gameInstanceId === gi.id && p.createdAt.getTime() >= now.getTime() - 42 * DAY)
          .map((p) => ({ at: p.createdAt.toISOString(), count: p.count })),
        recurring: { daily: tally("daily", true), dailyTasks: tally("daily", false), weekly: tally("weekly", true), weeklyTasks: tally("weekly", false) },
      };
    });

    // Countdowns: active + upcoming banners/events across the installed games.
    const gameKeys = [...new Set(instances.map((gi) => gi.gameKey))];
    const [rawBanners, events] = await Promise.all([
      listBanners(gameKeys, "current", now, 100),
      listEvents(gameKeys, "current", now, 100),
    ]);

    const banners = await withFeaturedDetails(rawBanners, instances);

    // Material subtasks done/total per parent goal (same "done" rule as the board).
    const goalMaterials: Record<string, { done: number; total: number }> = {};
    for (const t of enriched) {
      if (!t.parentId) continue;
      const m = (goalMaterials[t.parentId] ??= { done: 0, total: 0 });
      m.total += 1;
      if ((t.target ?? 0) > 0 && t.progress >= (t.target ?? 0)) m.done += 1;
    }

    return dashboardDto.parse({
      games,
      // Top-level, non-backlog goals — subtasks live under their parent, and
      // completionist backlog goals stay out of the active list.
      goals: enriched.filter((t) => t.type === "goal" && !t.parentId && !t.backlog),
      goalMaterials,
      timeline: { banners, events },
    });
  });
}
