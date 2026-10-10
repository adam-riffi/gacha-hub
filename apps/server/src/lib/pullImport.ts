import { pullsFromRecords, type BannerFeatured, type PullRecord } from "@gacha/shared";
import type { GameInstance } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { gameOrThrow, getCatalog } from "../api/util.js";

/**
 * Adds a profile's pull history (ADR 0005): one entry per record not seen
 * before, featured or not from the banners on record. The history is the
 * record for the span it covers, so manual entries on a banner up to its
 * newest imported pull are replaced. Every run is kept as an ImportRun.
 */
export async function importPulls(userId: string, instance: GameInstance, provider: string, records: readonly PullRecord[]): Promise<{ added: number; skipped: number }> {
  const game = gameOrThrow(instance.gameKey);
  const banners = await prisma.banner.findMany({ where: { gameKey: game.key } });
  const { pulls, skipped } = pullsFromRecords(
    game,
    records,
    banners.map((b) => ({ kind: b.kind, startsAt: b.startsAt, endsAt: b.endsAt, featured: b.featured as BannerFeatured[] })),
  );
  const seen = new Set(
    (await prisma.pullEntry.findMany({ where: { gameInstanceId: instance.id, recordId: { not: null } }, select: { recordId: true } })).map((e) => e.recordId),
  );
  // Skips ids already stored, and an id repeated within one file.
  const fresh = pulls.filter((p) => !seen.has(p.recordId) && Boolean(seen.add(p.recordId)));
  const index = (await getCatalog(game))?.index;
  const known = (id: string | null) => (id && (!index || index.characters.has(id) || index.weapons.has(id)) ? id : null);
  const newest = new Map<string, Date>();
  for (const p of fresh) {
    const upTo = newest.get(p.bannerKey);
    if (!upTo || p.createdAt > upTo) newest.set(p.bannerKey, p.createdAt);
  }
  const counts = { added: fresh.length, skipped: skipped + pulls.length - fresh.length };

  await prisma.$transaction([
    ...[...newest].map(([bannerKey, upTo]) => prisma.pullEntry.deleteMany({ where: { gameInstanceId: instance.id, bannerKey, source: "manual", createdAt: { lte: upTo } } })),
    prisma.pullEntry.createMany({
      data: fresh.map((p) => ({ gameInstanceId: instance.id, bannerKey: p.bannerKey, count: 1, fiveStar: p.fiveStar, featured: p.featured, catalogId: known(p.catalogId), source: provider, recordId: p.recordId, createdAt: p.createdAt })),
    }),
    prisma.importRun.create({ data: { userId, gameInstanceId: instance.id, provider, kind: "pulls", ...counts } }),
  ]);
  return counts;
}
