import { byNearestDeadline, type TimelineDto } from "@gacha/shared";
import type { DashboardData } from "./types";

export type DashGame = DashboardData["games"][number];
export type Banner = TimelineDto["banners"][number];
export interface RosterEntry {
  game: DashGame;
  banners: Banner[];
}

/**
 * The games Home rotates through, nearest deadline first, each with its
 * running banners by end date (VISUAL-DESIGN.md §7). A game without banners
 * sorts last and holds one empty slot on the Banners card.
 */
export function homeRoster(games: DashGame[], banners: Banner[]): RosterEntry[] {
  const entries = games.map((game) => ({
    game,
    banners: banners.filter((banner) => banner.status === "active" && banner.gameKey === game.gameKey).sort((first, second) => first.endsAt.localeCompare(second.endsAt)),
  }));
  return byNearestDeadline(entries, (rosterEntry) => rosterEntry.banners.map((banner) => Date.parse(banner.endsAt)));
}
