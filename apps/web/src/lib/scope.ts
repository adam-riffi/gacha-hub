/**
 * The shell's two axes (WIREFRAMES.md, Shell; round 29): the side bar picks the
 * scope, ALL or one game; the top bar picks the screen of that scope. Home,
 * Tasks and the calendar still take a game as `?game=<key>` from a link.
 */
export type Section = "all" | "games" | "tasks" | "banners" | "settings";

export function sectionOf(path: string): Section {
  if (path === "/library" || path.startsWith("/games/") || path.startsWith("/characters/")) return "games";
  if (path === "/tasks") return "tasks";
  if (path === "/timeline") return "banners";
  if (path === "/settings" || path.startsWith("/settings/")) return "settings";
  return "all";
}

export interface ScopeGame {
  key: string;
  instanceId: string;
}

/**
 * Another game's hub at the tab open now (Georges, round 4): Genshin's Pulls
 * leads to Star Rail's Pulls; a character's sheet or a unit page to its
 * Characters; a tab the other game lacks to its first, Activities.
 */
export function hubPathFor(pathname: string, game: ScopeGame, screens: string[]): string {
  const section = pathname.startsWith("/characters/") ? "characters" : pathname.split("/")[3];
  const tab = section === "units" ? "characters" : section;
  return tab && screens.includes(tab) ? `/games/${game.instanceId}/${tab}` : `/games/${game.instanceId}`;
}

/** Where a section opens for a scope (null is the Overview). Settings has no scope; Home with a game is its hub (round 27). */
export function sectionHref(section: Section, game: ScopeGame | null): string {
  const query = game ? `?game=${game.key}` : "";
  switch (section) {
    case "all":
      return game ? `/games/${game.instanceId}` : "/";
    case "games":
      return game ? `/games/${game.instanceId}` : "/library";
    case "tasks":
      return `/tasks${query}`;
    case "banners":
      return `/timeline${query}`;
    case "settings":
      return "/settings";
  }
}
