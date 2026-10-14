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
  const index = (await getCatalog(game))?.index;
  // A record named but without an id (Genshin's official log) is matched by name, so its 50/50 can be read.
  const byName = new Map(index ? [...index.characters.values(), ...index.weapons.values()].map((unit) => [unit.name.toLowerCase(), unit.id]) : []);
  const { pulls, skipped } = pullsFromRecords(
    game,
    records.map((record) => (record.itemId || !record.name ? record : { ...record, itemId: byName.get(record.name.toLowerCase()) })),
    banners.map((banner) => ({ kind: banner.kind, startsAt: banner.startsAt, endsAt: banner.endsAt, featured: banner.featured as BannerFeatured[] })),
  );
  const seen = new Set(
    (await prisma.pullEntry.findMany({ where: { gameInstanceId: instance.id, recordId: { not: null } }, select: { recordId: true } })).map((pullEntry) => pullEntry.recordId),
  );
  // Skips ids already stored, and an id repeated within one file.
  const fresh = pulls.filter((pull) => !seen.has(pull.recordId) && Boolean(seen.add(pull.recordId)));
  const known = (id: string | null) => (id && (!index || index.characters.has(id) || index.weapons.has(id)) ? id : null);
  const newest = new Map<string, Date>();
  for (const pull of fresh) {
    const upTo = newest.get(pull.bannerKey);
    if (!upTo || pull.createdAt > upTo) newest.set(pull.bannerKey, pull.createdAt);
  }
  const counts = { added: fresh.length, skipped: skipped + pulls.length - fresh.length };

  await prisma.$transaction([
    ...[...newest].map(([bannerKey, upTo]) => prisma.pullEntry.deleteMany({ where: { gameInstanceId: instance.id, bannerKey, source: "manual", createdAt: { lte: upTo } } })),
    prisma.pullEntry.createMany({
      data: fresh.map((pull) => ({ gameInstanceId: instance.id, bannerKey: pull.bannerKey, count: 1, fiveStar: pull.fiveStar, featured: pull.featured, catalogId: known(pull.catalogId), source: provider, recordId: pull.recordId, record: pull.record, createdAt: pull.createdAt })),
    }),
    prisma.importRun.create({ data: { userId, gameInstanceId: instance.id, provider, kind: "pulls", ...counts } }),
  ]);
  return counts;
}
