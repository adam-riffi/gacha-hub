import type { FastifyInstance } from "fastify";
import { BUILT_STATUSES, dashboardDto, gameDay, getGame, goalSteps, listedGoal, pityState, shownBanners } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { getGameServerModule } from "../games/index.js";
import { listBanners, listEvents, withFeaturedDetails } from "../lib/timeline.js";
import { buildRegionContext, serializeTask } from "./tasks.js";
import { allCurrencies } from "../lib/currencies.js";
import { staminaProjection } from "../lib/regen.js";
import { getCatalog, regionForInstance } from "./util.js";

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
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    // Owned characters per profile, for the "X built / Y owned" analytic.
    const ownedRows = await prisma.ownership.groupBy({
      by: ["gameInstanceId"],
      where: { gameInstanceId: { in: instances.map((instance) => instance.id) }, kind: "character" },
      _count: true,
    });
    const ownedByInstance = new Map(ownedRows.map((ownedRow) => [ownedRow.gameInstanceId, ownedRow._count]));
    const gearRows = await prisma.gearPiece.groupBy({
      by: ["gameInstanceId"],
      where: { gameInstanceId: { in: instances.map((instance) => instance.id) } },
      _count: true,
    });
    const gearByInstance = new Map(gearRows.map((gearRow) => [gearRow.gameInstanceId, gearRow._count]));
    // Countdowns: active + upcoming banners/events across the installed games.
    const gameKeys = [...new Set(instances.map((gameInstance) => gameInstance.gameKey))];
    const [rawBanners, events] = await Promise.all([
      listBanners(gameKeys, "current", now, 100),
      listEvents(gameKeys, "current", now, 100),
    ]);
    // Pull entries in order, for pity per banner (derived, ADR 0002).
    const pullRows = await prisma.pullEntry.findMany({
      where: { gameInstanceId: { in: instances.map((instance) => instance.id) } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { gameInstanceId: true, bannerKey: true, count: true, fiveStar: true, featured: true, record: true, createdAt: true },
    });
    // The last 26 weeks of day records (the Home heatmap, open goals, pulls gained).
    const dayRows = await prisma.dayRecord.findMany({
      where: { gameInstanceId: { in: instances.map((instance) => instance.id) }, day: { gte: new Date(now.getTime() - 181 * DAY).toISOString().slice(0, 10) } },
      orderBy: { day: "asc" },
      select: { gameInstanceId: true, day: true, dailiesDone: true, dailiesTotal: true, goalsOpen: true, pulls: true },
    });
    // Passes and recent endgame results, for the pass card, Endgame · next resets and Expiring soon.
    const passRows = await prisma.passState.findMany({ where: { gameInstanceId: { in: instances.map((instance) => instance.id) } } });
    const cycleRows = await prisma.cycleResult.findMany({
      where: { gameInstanceId: { in: instances.map((instance) => instance.id) }, cycleStart: { gte: new Date(now.getTime() - 120 * DAY) } },
      orderBy: { cycleStart: "desc" },
    });
    // Catalogs are cached per process after the first load.
    const catalogs = new Map(
      await Promise.all(
        [...new Set(instances.map((gameInstance) => gameInstance.gameKey))].map(async (gameKey) => {
          const game = getGame(gameKey);
          return [gameKey, game ? await getCatalog(game) : null] as const;
        }),
      ),
    );

    const tasks = await prisma.task.findMany({ where: { userId } });
    const regionContext = await buildRegionContext(tasks);
    const enriched = tasks.map((task) => serializeTask(task, regionContext, now));
    const byRef = new Map<string, typeof enriched>();
    for (const task of enriched) {
      const refTasks = byRef.get(task.refId) ?? [];
      refTasks.push(task);
      byRef.set(task.refId, refTasks);
    }

    const extras = await Promise.all(
      instances.map((gameInstance) => getGameServerModule(gameInstance.gameKey)?.dashboardExtras?.(gameInstance).catch(() => undefined)),
    );

    const games = instances.map((gameInstance, instanceIndex) => {
      const game = getGame(gameInstance.gameKey);
      const currencyByKey = new Map((game?.currencies ?? []).map((currency) => [currency.key, currency]));
      const dailies = (byRef.get(gameInstance.id) ?? []).filter((task) => task.type === "recurring");
      const soonest = dailies
        .map((daily) => daily.nextReset)
        .filter((resetAt): resetAt is string => Boolean(resetAt))
        .sort()[0];
      // The game's own recurring items are the ones it seeds (matched by title, as the restore route does).
      const builtIn = new Set((game?.defaultTasks ?? []).map((defaultTask) => defaultTask.title.toLowerCase()));
      const tally = (cadence: string, own: boolean) => {
        const mine = dailies.filter((daily) => (daily.cadence ?? "daily") === cadence && builtIn.has(daily.title.toLowerCase()) === own);
        return { done: mine.filter((daily) => daily.doneThisCycle).length, total: mine.length };
      };
      return {
        instanceId: gameInstance.id,
        gameKey: gameInstance.gameKey,
        name: game?.name ?? gameInstance.gameKey,
        accent: game?.accent ?? "#7c8cff",
        regionKey: gameInstance.regionKey,
        sleeping: gameInstance.sleeping,
        characterCount: gameInstance.characters.length,
        ownedCharacters: ownedByInstance.get(gameInstance.id) ?? 0,
        catalogCharacters: catalogs.get(gameInstance.gameKey)?.catalog.characters.length ?? null,
        gearPieces: gearByInstance.get(gameInstance.id) ?? 0,
        // Distinct catalog characters marked good/perfect.
        builtCharacters: new Set(
          gameInstance.characters.filter((character) => character.catalogId && BUILT_STATUSES.includes(character.buildStatus as never)).map((character) => character.catalogId),
        ).size,
        currencies: (game ? allCurrencies(game.currencies, gameInstance.currencies, gameInstance.createdAt) : gameInstance.currencies).map((currency) => {
          const currencyDefinition = currencyByKey.get(currency.key);
          return {
            key: currency.key,
            label: currencyDefinition?.label ?? currency.key,
            value: currency.value,
            cap: currencyDefinition?.cap ?? null,
            regenPerHour: currencyDefinition?.regenPerHour ?? null,
            pullCost: currencyDefinition?.pullCost ?? null,
            pullLabel: currencyDefinition?.pullLabel ?? null,
            standardOnly: currencyDefinition?.standardOnly ?? false,
            onlyFor: currencyDefinition?.onlyFor ?? null,
          };
        }),
        dailies,
        nextReset: soonest ?? null,
        extras: extras[instanceIndex],
        pity: (game ? shownBanners(game) : []).filter((bannerRules) => !((gameInstance.hiddenBanners as string[] | null) ?? []).includes(bannerRules.key)).map((rules) => {
          const pityNow = pityState(pullRows.filter((pullRow) => pullRow.gameInstanceId === gameInstance.id && pullRow.bannerKey === rules.key), rules);
          // The spark counts the pulls on the banner running now since it began.
          const running = rules.spark ? rawBanners.find((banner) => banner.gameKey === gameInstance.gameKey && banner.kind === rules.key && new Date(banner.startsAt) <= now && new Date(banner.endsAt) > now) : undefined;
          const sinceStart = running ? pullRows.filter((pullRow) => pullRow.gameInstanceId === gameInstance.id && pullRow.bannerKey === rules.key && pullRow.createdAt >= new Date(running.startsAt)).reduce((total, pullRow) => total + pullRow.count, 0) : 0;
          const spark = rules.spark && running ? { at: Math.min(rules.spark, sinceStart), of: rules.spark } : null;
          return { key: rules.key, label: rules.label, pity: pityNow.pity, hardPity: rules.hardPity, guaranteed: pityNow.guaranteed, spark };
        }),
        stamina: game ? staminaProjection(game, gameInstance.currencies, now, gameInstance.accountLevel) : null,
        passes: (() => {
          const battle = passRows.find((passRow) => passRow.gameInstanceId === gameInstance.id && passRow.kind === "battle");
          const monthly = passRows.find((passRow) => passRow.gameInstanceId === gameInstance.id && passRow.kind === "monthly");
          return {
            battle: battle ? { level: battle.level ?? 0, weeklyXp: battle.weeklyXp ?? 0, updatedAt: battle.updatedAt.toISOString() } : null,
            monthly: monthly?.endsAt ? { endsAt: monthly.endsAt.toISOString() } : null,
          };
        })(),
        cycles: cycleRows
          .filter((cycleRow) => cycleRow.gameInstanceId === gameInstance.id)
          .map((cycleRow) => ({ modeKey: cycleRow.modeKey, cycleStart: cycleRow.cycleStart.toISOString(), result: cycleRow.result, detail: cycleRow.detail, premium: cycleRow.premium, source: cycleRow.source })),
        pullLog: pullRows
          .filter((pullRow) => pullRow.gameInstanceId === gameInstance.id && pullRow.createdAt.getTime() >= now.getTime() - 42 * DAY)
          .map((pullRow) => ({ at: pullRow.createdAt.toISOString(), count: pullRow.count })),
        gameDay: game ? gameDay(regionForInstance(game, gameInstance), now) : null,
        days: dayRows.filter((dayRow) => dayRow.gameInstanceId === gameInstance.id).map(({ gameInstanceId: _gameInstanceId, ...dayRow }) => dayRow),
        recurring: { daily: tally("daily", true), dailyTasks: tally("daily", false), weekly: tally("weekly", true), weeklyTasks: tally("weekly", false) },
      };
    });


    const banners = await withFeaturedDetails(rawBanners, instances);

    // Each goal's steps done/total, its linked goals' added (the board's rule).
    const goalMaterials: Record<string, { done: number; total: number }> = {};
    for (const task of enriched) {
      if (!listedGoal(task) || !enriched.some((child) => child.parentId === task.id)) continue;
      const [done, total] = goalSteps(task, enriched);
      goalMaterials[task.id] = { done, total };
    }

    return dashboardDto.parse({
      games,
      // Goals on their own (linked ones too), not backlog — material steps live
      // under their goal, and completionist backlog goals stay out of the active list.
      goals: enriched.filter((task) => task.type === "goal" && listedGoal(task) && !task.backlog),
      goalMaterials,
      timeline: { banners, events },
    });
  });
}
