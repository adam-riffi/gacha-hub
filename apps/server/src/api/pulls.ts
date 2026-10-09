import type { FastifyInstance } from "fastify";
import type { PullEntry } from "../generated/prisma/client.js";
import {
  addPullsInput,
  calibratePullsInput,
  calibration,
  pityState,
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
  for (const e of entries) {
    run += e.count;
    if (!e.fiveStar) continue;
    if (e.count > 0) out.push({ id: e.id, catalogId: e.catalogId, featured: e.featured, pity: run, at: e.createdAt });
    run = 0;
  }
  return out.reverse();
}

/** A history is possible only if no run reaches past hard pity without a 5★. */
function withinHardPity(entries: PullEntryLike[], rules: PullBannerRules): boolean {
  let run = 0;
  for (const e of entries) {
    run += e.count;
    if (e.fiveStar) {
      if (run > rules.hardPity) return false;
      run = 0;
    }
  }
  return run < rules.hardPity;
}

function bannerOf(game: GameDefinition, key: string): PullBannerRules | undefined {
  return game.pullBanners?.find((b) => b.key === key);
}

const ordered = (gameInstanceId: string, bannerKey?: string) =>
  prisma.pullEntry.findMany({
    where: { gameInstanceId, ...(bannerKey ? { bannerKey } : {}) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

/** Pull log per banner type (ADR 0002): entries in, pity and guarantee derived. */
export async function registerPullRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/instances/:id/pulls", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gi.gameKey);
    const entries = await ordered(gi.id);
    return pullLogDto.parse({
      banners: (game.pullBanners ?? []).map((rules) => {
        const mine = entries.filter((e) => e.bannerKey === rules.key);
        return { ...rules, state: pityState(mine, rules), fiveStars: drops(mine), recent: mine.slice(-RECENT).reverse() };
      }),
    });
  });

  // Log a batch; the 5★ position splits it so pity restarts after the drop.
  app.post<{ Params: { id: string } }>("/api/instances/:id/pulls", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const game = gameOrThrow(gi.gameKey);
    const body = addPullsInput.parse(req.body);
    const rules = bannerOf(game, body.bannerKey);
    if (!rules) return reply.code(400).send({ error: "unknown_banner" });
    if (body.catalogId) {
      const cat = await getCatalog(game);
      if (cat && !cat.index.characters.has(body.catalogId) && !cat.index.weapons.has(body.catalogId)) {
        return reply.code(400).send({ error: "unknown_catalog_id" });
      }
    }
    const added = splitPulls(body.count, body.fiveStarAt, body.featured);
    if (!withinHardPity([...(await ordered(gi.id, rules.key)), ...added], rules)) {
      return reply.code(400).send({ error: "past_hard_pity", hardPity: rules.hardPity });
    }
    await insert(gi.id, rules.key, added, body.catalogId ?? null);
    return reply.code(201).send({ added: added.length });
  });

  app.post<{ Params: { id: string } }>("/api/instances/:id/pulls/calibrate", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const body = calibratePullsInput.parse(req.body);
    const rules = bannerOf(gameOrThrow(gi.gameKey), body.bannerKey);
    if (!rules) return reply.code(400).send({ error: "unknown_banner" });
    if (body.pity >= rules.hardPity) return reply.code(400).send({ error: "past_hard_pity", hardPity: rules.hardPity });
    await insert(gi.id, rules.key, calibration(body.pity, body.guaranteed), null);
    return reply.code(201).send({ ok: true });
  });

  app.delete<{ Params: { id: string; entryId: string } }>("/api/instances/:id/pulls/:entryId", { preHandler: requireUser }, async (req, reply) => {
    const gi = await loadInstance(req.user!.id, req.params.id);
    if (!gi) return reply.code(404).send({ error: "not_found" });
    const { count } = await prisma.pullEntry.deleteMany({ where: { id: req.params.entryId, gameInstanceId: gi.id } });
    if (count === 0) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}

/** Insert in order: entries of one batch get consecutive timestamps. */
async function insert(gameInstanceId: string, bannerKey: string, entries: PullEntryLike[], catalogId: string | null) {
  const now = Date.now();
  await prisma.pullEntry.createMany({
    data: entries.map((e, i) => ({
      gameInstanceId,
      bannerKey,
      count: e.count,
      fiveStar: e.fiveStar,
      featured: e.featured ?? null,
      catalogId: e.fiveStar && e.count > 0 ? catalogId : null,
      createdAt: new Date(now + i),
    })),
  });
}
