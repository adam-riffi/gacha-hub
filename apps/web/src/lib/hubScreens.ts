import { getGame } from "@gacha/shared";

export type Screen = "overview" | "activities" | "endgame" | "ownership" | "characters" | "teams" | "weapons" | "gear" | "materials" | "planner" | "pulls" | "profile";

/** What each game calls its gear sets. */
const GEAR_LABEL: Record<string, string> = {
  genshin: "Artifacts",
  hsr: "Relics",
  zzz: "Drive discs",
  wuwa: "Echoes",
  nte: "Console",
};

/** Games whose catalog has no costs (Endfield's public tables publish none): no Planner. */
const NO_COSTS = new Set(["endfield"]);

/**
 * The hub's tabs a game has, in order, each with its path under the hub
 * (the Overview, the game's dashboard, is the hub itself since round 27):
 * Pulls needs pull rules, Teams a catalog, the gear tab and the Planner a
 * catalog with gear and costs.
 */
export function hubScreens(gameKey: string, instanceId: string): { key: Screen; label: string; to: string }[] {
  const hasCatalog = Boolean(getGame(gameKey)?.loadCatalog);
  return [
    // The dashboard opens the hub (round 27, Georges: "each game's dashboard is outside of its category"); Activities follows.
    { key: "overview", label: "Overview", to: `/games/${instanceId}` },
    { key: "activities", label: "Activities", to: `/games/${instanceId}/activities` },
    { key: "endgame", label: "Endgame", to: `/games/${instanceId}/endgame` },
    // The board's order (WIREFRAMES.md Game hub): Pulls, then Characters (which replaces Ownership).
    ...(gameKey && getGame(gameKey)?.pullBanners?.length ? [{ key: "pulls" as const, label: "Pulls", to: `/games/${instanceId}/pulls` }] : []),
    { key: "characters", label: "Characters", to: `/games/${instanceId}/characters` },
    // Teams have a tab of their own (Georges, 2026-10-10); their members come from the catalog.
    ...(hasCatalog ? [{ key: "teams" as const, label: "Teams", to: `/games/${instanceId}/teams` }] : []),
    // Weapons have a tab of their own on every game (Georges, 2026-10-11): by name where the catalog lists none.
    { key: "weapons", label: "Weapons", to: `/games/${instanceId}/weapons` },
    ...(hasCatalog ? [{ key: "gear" as const, label: GEAR_LABEL[gameKey] || "Gear", to: `/games/${instanceId}/gear` }] : []),
    ...(hasCatalog && !NO_COSTS.has(gameKey) ? [{ key: "planner" as const, label: "Planner", to: `/games/${instanceId}/planner` }] : []),
    // Profile (G8) closes the row; the old overview keeps its route, linked from Profile.
    { key: "profile", label: "Profile", to: `/games/${instanceId}/profile` },
  ];
}

export const gearLabel = (gameKey?: string) => (gameKey && GEAR_LABEL[gameKey]) || "Gear";
