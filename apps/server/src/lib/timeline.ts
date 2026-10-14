import type { Banner, Event } from "../generated/prisma/client.js";
import {
  bannerDto,
  bannerInput,
  eventDto,
  eventInput,
  getGame,
  readEffects,
  timedStatus,
  type BannerDto,
  type BannerInput,
  type EventDto,
  type EventInput,
} from "@gacha/shared";
import { prisma } from "./prisma.js";
import { getCatalog } from "../api/util.js";

/* Banners and events are global per game (uploaded by admins) and read by
 * everyone: these helpers serialize rows, export them in the upload shape,
 * and select them by time window. */

export function serializeBanner(row: Banner, now = new Date()): BannerDto {
  return bannerDto.parse({ ...row, status: timedStatus(row.startsAt, row.endsAt, now) });
}

export function serializeEvent(row: Event, now = new Date()): EventDto {
  return eventDto.parse({ ...row, effects: storedEffects(row), status: timedStatus(row.startsAt, row.endsAt, now) });
}

/** An event's effects, read again for its game so a stored kind that no longer parses shows as a note. */
function storedEffects(row: Event) {
  const game = getGame(row.gameKey);
  return game && Array.isArray(row.effects) ? readEffects(row.effects, game) : null;
}

/** Export shape == upload shape, so an exported payload re-uploads unchanged. */
export function exportBanner(row: Banner): BannerInput {
  return bannerInput.parse({
    key: row.key,
    name: row.name,
    kind: row.kind,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    featured: row.featured ?? [],
    version: row.version,
    ...(row.payload && typeof row.payload === "object" ? { payload: row.payload } : {}),
  });
}

export function exportEvent(row: Event): EventInput {
  return eventInput.parse({
    key: row.key,
    name: row.name,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    ...(row.description ? { description: row.description } : {}),
    ...(Array.isArray(row.rewards) ? { rewards: row.rewards } : {}),
    ...(storedEffects(row) ? { effects: storedEffects(row) } : {}),
    ...(row.url ? { url: row.url } : {}),
    ...(row.payload && typeof row.payload === "object" ? { payload: row.payload } : {}),
  });
}

export type TimelineFilter = "active" | "upcoming" | "ended" | "current" | "all";

export function parseTimelineFilter(raw: string | undefined): TimelineFilter {
  return raw === "active" || raw === "upcoming" || raw === "ended" || raw === "all" ? raw : "current";
}

/** Prisma `where` fragment for a time-window filter. */
export function timelineWhere(filter: TimelineFilter, now: Date) {
  switch (filter) {
    case "active":
      return { startsAt: { lte: now }, endsAt: { gt: now } };
    case "upcoming":
      return { startsAt: { gt: now } };
    case "ended":
      return { endsAt: { lte: now } };
    case "current":
      return { endsAt: { gt: now } };
    default:
      return {};
  }
}

export async function listBanners(gameKeys: string[], filter: TimelineFilter, now = new Date(), take = 200) {
  if (gameKeys.length === 0) return [];
  const rows = await prisma.banner.findMany({
    where: { gameKey: { in: gameKeys }, ...timelineWhere(filter, now) },
    orderBy: [{ startsAt: "asc" }, { key: "asc" }],
    take,
  });
  return rows.map((row) => serializeBanner(row, now));
}

export async function listEvents(gameKeys: string[], filter: TimelineFilter, now = new Date(), take = 200) {
  if (gameKeys.length === 0) return [];
  const rows = await prisma.event.findMany({
    where: { gameKey: { in: gameKeys }, ...timelineWhere(filter, now) },
    orderBy: [{ startsAt: "asc" }, { key: "asc" }],
    take,
  });
  return rows.map((row) => serializeEvent(row, now));
}

/** "3d 4h", "2h 05m", "12m", or "now". */
export function formatRemaining(until: Date | string, now = new Date()): string {
  const milliseconds = new Date(until).getTime() - now.getTime();
  if (milliseconds <= 0) return "now";
  const days = Math.floor(milliseconds / 86_400_000);
  const hours = Math.floor((milliseconds % 86_400_000) / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

/** Banners and events overlapping [from, to) for these games, ended ones included. */
export async function listWindow(gameKeys: string[], from: Date, to: Date, now = new Date()) {
  if (gameKeys.length === 0) return { banners: [], events: [] };
  const where = { gameKey: { in: gameKeys }, endsAt: { gt: from }, startsAt: { lt: to } };
  const orderBy = [{ startsAt: "asc" as const }, { key: "asc" as const }];
  const [banners, events] = await Promise.all([
    prisma.banner.findMany({ where, orderBy, take: 300 }),
    prisma.event.findMany({ where, orderBy, take: 300 }),
  ]);
  return { banners: banners.map((banner) => serializeBanner(banner, now)), events: events.map((event) => serializeEvent(event, now)) };
}

/** Featured units get catalog name/icon/rarity and whether the user owns them. */
export async function withFeaturedDetails(banners: BannerDto[], instances: { id: string; gameKey: string }[]): Promise<BannerDto[]> {
  const featuredIds = banners.flatMap((banner) => banner.featured.map((featuredUnit) => featuredUnit.catalogId));
  const owned = featuredIds.length
    ? await prisma.ownership.findMany({
        where: { gameInstanceId: { in: instances.map((instance) => instance.id) }, catalogId: { in: featuredIds } },
        select: { gameInstanceId: true, kind: true, catalogId: true },
      })
    : [];
  const instanceByGame = new Map(instances.map((gameInstance) => [gameInstance.gameKey, gameInstance.id]));
  const owns = new Set(owned.map((ownedRow) => `${ownedRow.gameInstanceId}:${ownedRow.kind}:${ownedRow.catalogId}`));
  const catalogs = new Map(
    await Promise.all(
      [...new Set(banners.map((banner) => banner.gameKey))].map(async (gameKey) => {
        const game = getGame(gameKey);
        return [gameKey, game ? await getCatalog(game) : null] as const;
      }),
    ),
  );
  return banners.map((banner) => {
    const catalogIndex = catalogs.get(banner.gameKey)?.index;
    return {
      ...banner,
      featured: banner.featured.map((featuredUnit) => {
        const catalogEntry = featuredUnit.kind === "character" ? catalogIndex?.characters.get(featuredUnit.catalogId) : catalogIndex?.weapons.get(featuredUnit.catalogId);
        return {
          ...featuredUnit,
          ...(catalogEntry ? { name: catalogEntry.name, icon: catalogEntry.icon, splash: "splash" in catalogEntry ? catalogEntry.splash : undefined, rarity: catalogEntry.rarity } : {}),
          owned: owns.has(`${instanceByGame.get(banner.gameKey)}:${featuredUnit.kind}:${featuredUnit.catalogId}`),
        };
      }),
    };
  });
}
