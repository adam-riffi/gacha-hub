import { getGame } from "@gacha/shared";

export type Screen = "overview" | "activities" | "endgame" | "ownership" | "characters" | "teams" | "weapons" | "gear" | "materials" | "planner" | "pulls" | "profile" | "roster";

/** The roster's four lists (round 29): one screen in the top bar, Roster, with a switch inside. */
export const ROSTER: Screen[] = ["characters", "teams", "weapons", "gear"];

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
 * The roster's lists a game has (round 29), in order: Characters, Teams (a
 * catalog), Weapons (by name where the catalog lists none), the gear sets by
 * the game's own word (a catalog).
 */
export function rosterScreens(gameKey: string, instanceId: string): { key: Screen; label: string; to: string }[] {
  const hasCatalog = Boolean(getGame(gameKey)?.loadCatalog);
  return [
    { key: "characters", label: "Characters", to: `/games/${instanceId}/characters` },
    // Teams have a list of their own (Georges, 2026-10-10); their members come from the catalog.
    ...(hasCatalog ? [{ key: "teams" as const, label: "Teams", to: `/games/${instanceId}/teams` }] : []),
    // Weapons on every game (Georges, 2026-10-11): by name where the catalog lists none.
    { key: "weapons", label: "Weapons", to: `/games/${instanceId}/weapons` },
    ...(hasCatalog ? [{ key: "gear" as const, label: GEAR_LABEL[gameKey] || "Gear", to: `/games/${instanceId}/gear` }] : []),
  ];
}

/**
 * The hub's screens a game has, in order, each with its path under the hub
 * (the Overview, the game's dashboard, is the hub itself since round 27):
 * Pulls needs pull rules; Roster holds the four lists (`rosterScreens`, its
 * `paths`) behind one screen; the Planner needs a catalog with costs.
 */
export function hubScreens(gameKey: string, instanceId: string): { key: Screen; label: string; to: string; paths?: string[] }[] {
  const hasCatalog = Boolean(getGame(gameKey)?.loadCatalog);
  return [
    // The dashboard opens the hub (round 27, Georges: "each game's dashboard is outside of its category"); Activities follows.
    { key: "overview", label: "Overview", to: `/games/${instanceId}` },
    { key: "activities", label: "Activities", to: `/games/${instanceId}/activities` },
    { key: "endgame", label: "Endgame", to: `/games/${instanceId}/endgame` },
    ...(gameKey && getGame(gameKey)?.pullBanners?.length ? [{ key: "pulls" as const, label: "Pulls", to: `/games/${instanceId}/pulls` }] : []),
    { key: "roster", label: "Roster", to: `/games/${instanceId}/characters`, paths: rosterScreens(gameKey, instanceId).map((list) => list.key) },
    ...(hasCatalog && !NO_COSTS.has(gameKey) ? [{ key: "planner" as const, label: "Planner", to: `/games/${instanceId}/planner` }] : []),
    // Profile (G8) closes the row; the old overview keeps its route, linked from Profile.
    { key: "profile", label: "Profile", to: `/games/${instanceId}/profile` },
  ];
}

export const gearLabel = (gameKey?: string) => (gameKey && GEAR_LABEL[gameKey]) || "Gear";
