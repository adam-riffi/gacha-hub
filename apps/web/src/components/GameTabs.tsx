import { Link } from "react-router-dom";
import { getGame } from "@gacha/shared";
import { HubHeader } from "./hub/HubHeader";

export type Screen = "activities" | "endgame" | "ownership" | "characters" | "teams" | "weapons" | "gear" | "materials" | "planner" | "pulls" | "profile";

/** What each game calls its gear sets. */
const GEAR_LABEL: Record<string, string> = {
  genshin: "Artifacts",
  hsr: "Relics",
  zzz: "Drive discs",
  wuwa: "Echoes",
};

/** Games whose catalog lists characters only (Endfield's public tables have no gear sets or costs): no Gear or Planner tab. */
const CHARACTERS_ONLY = new Set(["endfield"]);

/**
 * The hub's tabs a game has, in order, each with its path under the hub
 * (Activities is the hub itself): Pulls needs pull rules, Teams a catalog,
 * the gear tab and the Planner a catalog with gear and costs.
 */
export function hubScreens(gameKey: string, instanceId: string): { key: Screen; label: string; to: string }[] {
  const hasCatalog = Boolean(getGame(gameKey)?.loadCatalog);
  return [
    // Activities opens the hub; each game's dashboard is Home with the game picked (Georges, round 4).
    { key: "activities", label: "Activities", to: `/games/${instanceId}` },
    { key: "endgame", label: "Endgame", to: `/games/${instanceId}/endgame` },
    // The board's order (WIREFRAMES.md Game hub): Pulls, then Characters (which replaces Ownership).
    ...(gameKey && getGame(gameKey)?.pullBanners?.length ? [{ key: "pulls" as const, label: "Pulls", to: `/games/${instanceId}/pulls` }] : []),
    { key: "characters", label: "Characters", to: `/games/${instanceId}/characters` },
    // Teams have a tab of their own (Georges, 2026-10-10); their members come from the catalog.
    ...(hasCatalog ? [{ key: "teams" as const, label: "Teams", to: `/games/${instanceId}/teams` }] : []),
    // Weapons have a tab of their own on every game (Georges, 2026-10-11): by name where the catalog lists none.
    { key: "weapons", label: "Weapons", to: `/games/${instanceId}/weapons` },
    ...(hasCatalog && !CHARACTERS_ONLY.has(gameKey ?? "")
      ? ([
          { key: "gear", label: (gameKey && GEAR_LABEL[gameKey]) || "Gear", to: `/games/${instanceId}/gear` },
          { key: "planner", label: "Planner", to: `/games/${instanceId}/planner` },
        ] as { key: Screen; label: string; to: string }[])
      : []),
    // Profile (G8) closes the row; the old overview keeps its route, linked from Profile.
    { key: "profile", label: "Profile", to: `/games/${instanceId}/profile` },
  ];
}

/** The game hub's header and its tabs, on every screen of the hub. */
export function GameTabs({ instanceId, active, gameKey }: { instanceId: string; active: Screen; gameKey?: string }) {
  const tabs = gameKey ? hubScreens(gameKey, instanceId) : [];
  return (
    <>
      <HubHeader instanceId={instanceId} />
      <nav className="hub-tabs" aria-label="Game screens">
        {tabs.map((t) => (
          <Link key={t.key} to={t.to} aria-current={active === t.key ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export const gearLabel = (gameKey?: string) => (gameKey && GEAR_LABEL[gameKey]) || "Gear";
