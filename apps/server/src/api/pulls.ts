import type { FastifyInstance } from "fastify";
import { Prisma, type PullEntry } from "../generated/prisma/client.js";
import {
  addPullsInput,
  bannerHistoryDto,
  calibratePullsInput,
  correctPullInput,
  calibration,
  pityState,
  shownBanners,
  pullLogDto,
  splitPulls,
  type GameDefinition,
  type PullBannerRules,
  type PullEntryLike,
} from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../auth/plugin.js";
import { gameOrThrow, getCatalog, loadInstance } from "./util.js";

const RECENT = 20;

/** 5★ drops with the pity each came at (markers reset without counting). */
function drops(entries: PullEntry[]) {
  const out: { id: string; catalogId: string | null; featured: boolean | null; pity: number; at: Date }[] = [];
  let run = 0;
  for (const entry of entries) {
    run += entry.count;
    if (!entry.fiveStar) continue;
    if (entry.count > 0) out.push({ id: entry.id, catalogId: entry.catalogId, featured: entry.featured, pity: run, at: entry.createdAt });
    run = 0;
  }
  return out.reverse();
}

/** A history is possible only if no run reaches past hard pity without a 5★. */
function withinHardPity(entries: PullEntryLike[], rules: PullBannerRules): boolean {
  let run = 0;
  for (const entry of entries) {
    run += entry.count;
    if (entry.fiveStar) {
      if (run > rules.hardPity) return false;
      run = 0;
    }
  }
  return run < rules.hardPity;
}

function bannerOf(game: GameDefinition, key: string): PullBannerRules | undefined {
  return game.pullBanners?.find((pullBanner) => pullBanner.key === key);
}

const ordered = (gameInstanceId: string, bannerKey?: string) =>
  prisma.pullEntry.findMany({
    where: { gameInstanceId, ...(bannerKey ? { bannerKey } : {}) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

/** Pull log per banner type (ADR 0002): entries in, pity and guarantee derived. */
export async function registerPullRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/pulls", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gameInstance.gameKey);
    const entries = await ordered(gameInstance.id);
    return pullLogDto.parse({
      banners: shownBanners(game).map((rules) => {
        const mine = entries.filter((entry) => entry.bannerKey === rules.key);
        return { ...rules, state: pityState(mine, rules), fiveStars: drops(mine), recent: mine.slice(-RECENT).reverse() };
      }),
    });
  });

  // Log a batch; the 5★ position splits it so pity restarts after the drop.
  app.post<{ Params: { id: string } }>("/api/instances/:id/pulls", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gameInstance.gameKey);
    const body = addPullsInput.parse(req.body);
    const rules = bannerOf(game, body.bannerKey);
    if (!rules) return reply.code(400).send({ error: "unknown_banner" });
    if (body.catalogId) {
      const loadedCatalog = await getCatalog(game);
      if (loadedCatalog && !loadedCatalog.index.characters.has(body.catalogId) && !loadedCatalog.index.weapons.has(body.catalogId)) {
        return reply.code(400).send({ error: "unknown_catalog_id" });
      }
    }
    const added = splitPulls(body.count, body.fiveStarAt, body.featured);
    if (!withinHardPity([...(await ordered(gameInstance.id, rules.key)), ...added], rules)) {
      return reply.code(400).send({ error: "past_hard_pity", hardPity: rules.hardPity });
    }
    await insert(gameInstance.id, rules.key, added, body.catalogId ?? null);
    return reply.code(201).send({ added: added.length });
  });

  app.post<{ Params: { id: string } }>("/api/instances/:id/pulls/calibrate", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const body = calibratePullsInput.parse(req.body);
    const rules = bannerOf(gameOrThrow(gameInstance.gameKey), body.bannerKey);
    if (!rules) return reply.code(400).send({ error: "unknown_banner" });
    if (body.pity >= rules.hardPity) return reply.code(400).send({ error: "past_hard_pity", hardPity: rules.hardPity });
    await insert(gameInstance.id, rules.key, calibration(body.pity, body.guaranteed), null);
    return reply.code(201).send({ ok: true });
  });

  // Correct a logged 5★: the pull it came at keeps the batch's size (the pulls after it grow or shrink), won or lost, which unit.
  app.patch<{ Params: { id: string; entryId: string } }>("/api/instances/:id/pulls/:entryId", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const body = correctPullInput.parse(req.body);
    const entry = await prisma.pullEntry.findFirst({ where: { id: req.params.entryId, gameInstanceId: gameInstance.id, fiveStar: true, count: { gt: 0 } } });
    if (!entry) return reply.code(404).send({ error: "not_found" });
    if (body.catalogId) {
      const loadedCatalog = await getCatalog(gameOrThrow(gameInstance.gameKey));
      if (loadedCatalog && !loadedCatalog.index.characters.has(body.catalogId) && !loadedCatalog.index.weapons.has(body.catalogId)) return reply.code(400).send({ error: "unknown_catalog_id" });
    }
    const all = await ordered(gameInstance.id, entry.bannerKey);
    const at = all.findIndex((candidate) => candidate.id === entry.id);
    // The run leading to it: the pulls since the previous 5★ (or marker), this one included.
    let start = at;
    while (start > 0 && !all[start - 1]!.fiveStar) start -= 1;
    const before = all.slice(start, at).reduce((total, pullEntry) => total + pullEntry.count, 0);
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    if (body.pity !== undefined) {
      if (body.pity <= before) return reply.code(400).send({ error: "before_the_run", min: before + 1 });
      const delta = body.pity - (before + entry.count);
      if (delta < 0) {
        // Earlier than logged: its batch's remaining pulls follow it.
        ops.push(prisma.pullEntry.create({ data: { gameInstanceId: gameInstance.id, bannerKey: entry.bannerKey, count: -delta, fiveStar: false, createdAt: new Date(entry.createdAt.getTime() + 1) } }));
      } else if (delta > 0) {
        // Later than logged: the pulls after it shrink, as far as there are some before the next 5★.
        let left = delta;
        for (const laterEntry of all.slice(at + 1)) {
          if (laterEntry.fiveStar || left === 0) break;
          const take = Math.min(left, laterEntry.count);
          left -= take;
          ops.push(take === laterEntry.count ? prisma.pullEntry.delete({ where: { id: laterEntry.id } }) : prisma.pullEntry.update({ where: { id: laterEntry.id }, data: { count: laterEntry.count - take } }));
        }
      }
    }
    ops.push(
      prisma.pullEntry.update({
        where: { id: entry.id },
        data: {
          ...(body.pity !== undefined ? { count: body.pity - before } : {}),
          ...(body.featured !== undefined ? { featured: body.featured } : {}),
          ...(body.catalogId !== undefined ? { catalogId: body.catalogId } : {}),
        },
      }),
    );
    await prisma.$transaction(ops);
    return { ok: true };
  });

  // The game's banners that began, newest first, with this profile's pulls on each and the 5★ it got there.
  app.get<{ Params: { id: string } }>("/api/instances/:id/pulls/history", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const banners = await prisma.banner.findMany({ where: { gameKey: gameInstance.gameKey, startsAt: { lte: new Date() } }, orderBy: { startsAt: "desc" }, take: 40 });
    const entries = await ordered(gameInstance.id);
    return bannerHistoryDto.parse(
      banners.map((banner) => {
        const mine = entries.filter((entry) => entry.bannerKey === banner.kind && entry.createdAt >= banner.startsAt && entry.createdAt < banner.endsAt);
        return {
          key: banner.key,
          name: banner.name,
          kind: banner.kind,
          startsAt: banner.startsAt,
          endsAt: banner.endsAt,
          featured: ((banner.featured ?? []) as { catalogId: string; kind: string }[]).map((featuredUnit) => ({ catalogId: featuredUnit.catalogId, kind: featuredUnit.kind })),
          pulls: mine.reduce((total, pullEntry) => total + pullEntry.count, 0),
          fiveStars: mine.filter((pullEntry) => pullEntry.fiveStar && pullEntry.count > 0).map((pullEntry) => ({ catalogId: pullEntry.catalogId, featured: pullEntry.featured })),
        };
      }),
    );
  });

  app.delete<{ Params: { id: string; entryId: string } }>("/api/instances/:id/pulls/:entryId", { preHandler: requireUser }, async (req, reply) => {
    const gameInstance = await loadInstance(req.user!.id, req.params.id);
    if (!gameInstance) return reply.code(404).send({ error: "not_found" });
    const { count } = await prisma.pullEntry.deleteMany({ where: { id: req.params.entryId, gameInstanceId: gameInstance.id } });
    if (count === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}

/** Insert in order: entries of one batch get consecutive timestamps. */
async function insert(gameInstanceId: string, bannerKey: string, entries: PullEntryLike[], catalogId: string | null) {
  const now = Date.now();
  await prisma.pullEntry.createMany({
    data: entries.map((entry, entryIndex) => ({
      gameInstanceId,
      bannerKey,
      count: entry.count,
      fiveStar: entry.fiveStar,
      featured: entry.featured ?? null,
      catalogId: entry.fiveStar && entry.count > 0 ? catalogId : null,
      createdAt: new Date(now + entryIndex),
    })),
  });
}
