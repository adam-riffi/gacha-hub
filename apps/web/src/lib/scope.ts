/**
 * The shell's two axes (WIREFRAMES.md, Shell): the rail picks a section, the
 * top strip picks a scope, the Overview or one game. Home, Tasks and the
 * calendar take the game as `?game=<key>`; Games opens the game's hub.
 */
export type Section = "all" | "games" | "tasks" | "banners" | "settings" | "admin";

export function sectionOf(path: string): Section {
  if (path === "/library" || path.startsWith("/games/") || path.startsWith("/characters/")) return "games";
  if (path === "/tasks") return "tasks";
  if (path === "/timeline") return "banners";
  if (path === "/settings") return "settings";
  if (path === "/admin") return "admin";
  return "all";
}

export interface ScopeGame {
  key: string;
  instanceId: string;
}

/** Where a section opens for a scope (null is the Overview). Settings and Admin have no scope. */
export function sectionHref(section: Section, game: ScopeGame | null): string {
  const q = game ? `?game=${game.key}` : "";
  switch (section) {
    case "all":
      return `/${q}`;
    case "games":
      return game ? `/games/${game.instanceId}` : "/library";
    case "tasks":
      return `/tasks${q}`;
    case "banners":
      return `/timeline${q}`;
    case "settings":
      return "/settings";
    case "admin":
      return "/admin";
  }
}
