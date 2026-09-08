import type { Banner, Event } from "@prisma/client";
import {
  bannerDto,
  bannerInput,
  eventDto,
  eventInput,
  timedStatus,
  type BannerDto,
  type BannerInput,
  type EventDto,
  type EventInput,
} from "@gacha/shared";
import { prisma } from "./prisma.js";

/* Banners and events are global per game (uploaded by admins) and read by
 * everyone: these helpers serialize rows, export them in the upload shape,
 * and select them by time window. */

export function serializeBanner(row: Banner, now = new Date()): BannerDto {
  return bannerDto.parse({ ...row, status: timedStatus(row.startsAt, row.endsAt, now) });
}

export function serializeEvent(row: Event, now = new Date()): EventDto {
  return eventDto.parse({ ...row, status: timedStatus(row.startsAt, row.endsAt, now) });
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
  return rows.map((r) => serializeBanner(r, now));
}

export async function listEvents(gameKeys: string[], filter: TimelineFilter, now = new Date(), take = 200) {
  if (gameKeys.length === 0) return [];
  const rows = await prisma.event.findMany({
    where: { gameKey: { in: gameKeys }, ...timelineWhere(filter, now) },
    orderBy: [{ startsAt: "asc" }, { key: "asc" }],
    take,
  });
  return rows.map((r) => serializeEvent(r, now));
}

/** "3d 4h", "2h 05m", "12m", or "now". */
export function formatRemaining(until: Date | string, now = new Date()): string {
  const ms = new Date(until).getTime() - now.getTime();
  if (ms <= 0) return "now";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}
