import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getGame } from "@gacha/shared";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { hubPathFor, sectionOf, type ScopeGame, type Section } from "../lib/scope";
import { ROSTER, hubScreens, type Screen } from "../lib/hubScreens";
import type { CharacterDetail, InstanceListItem } from "../lib/types";
import { GameMark } from "./GameMark";

/** Line icons for the side bar's two fixed items (round 12: plain pictures; abstract shapes read badly). */
const ALL_ICON = <path d="M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z" />;
const SETTINGS_ICON = (
  <>
    <path d="M4 7.5h16M4 16.5h16" />
    <circle cx="9.5" cy="7.5" r="2.4" />
    <circle cx="14.5" cy="16.5" r="2.4" />
  </>
);
/** The screens across all games, in the top bar (round 29): Home, Tasks, Banners. */
const SECTIONS: { section: Section; to: string; label: string; name: string }[] = [
  { section: "all", to: "/", label: "Home", name: "Home, all games" },
  { section: "tasks", to: "/tasks", label: "Tasks", name: "Tasks and goals" },
  { section: "banners", to: "/timeline", label: "Banners", name: "Banners and events" },
];

const WEEKDAY = new Intl.DateTimeFormat("en", { weekday: "short" });
const today = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} · ${WEEKDAY.format(date).toUpperCase()}`;

/** "MON 2026-09-14" for a YYYY-MM-DD day. */
const dayLabel = (day: string) => `${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)).getDay()]} ${day}`;

/** The screen a hub path is on: the tab's key; the roster's lists, a unit page and a character's sheet count as Roster. */
function screenOf(pathname: string): Screen | null {
  if (pathname.startsWith("/characters/")) return "roster";
  const part = pathname.split("/")[3];
  if (!part) return "overview";
  return part === "units" || ROSTER.includes(part as Screen) ? "roster" : (part as Screen);
}

/**
 * The shell in two layers (round 29, Georges: "the navbar seems redundant … the side nav bar as well"): the side bar is
 * the scope (ALL, then every game as its icon, Settings at its foot); the top bar is the screens of that scope (Home,
 * Tasks and Banners across all games; a game's own screens inside a game). A pinned past day shows beside the date. The
 * scope's game sets --accent.
 */
export function Layout({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const section = sectionOf(pathname);
  const { data: instances = [] } = useQuery({
    queryKey: ["instances"],
    queryFn: () => api.get<InstanceListItem[]>("/api/instances"),
    enabled: Boolean(currentUser?.user),
  });
  const characterId = pathname.startsWith("/characters/") ? pathname.split("/")[2] : undefined;
  const { data: character } = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => api.get<CharacterDetail>(`/api/characters/${characterId}`),
    enabled: Boolean(characterId),
  });

  const hubId = pathname.startsWith("/games/") ? pathname.split("/")[2] : undefined;
  const scopeKey = section === "games" ? (instances.find((instance) => instance.id === hubId)?.gameKey ?? character?.gameKey) : params.get("game");
  const current = instances.find((instance) => instance.gameKey === scopeKey);
  const scope: ScopeGame | null = current ? { key: current.gameKey, instanceId: current.id } : null;
  // Inside a game's hub (or a character's sheet) the top bar holds the game's screens.
  const hub = section === "games" ? current : undefined;
  const active = hub ? screenOf(pathname) : null;
  // Where a game in the side bar leads: the same screen of its hub from a hub (round 4), its Planner from Tasks and its Pulls
  // from Banners (its goals and its banners live there), its Overview otherwise.
  const targetFor = (gameInstance: InstanceListItem) => {
    const game: ScopeGame = { key: gameInstance.gameKey, instanceId: gameInstance.id };
    const screens = hubScreens(gameInstance.gameKey, gameInstance.id);
    if (section === "games") return hubPathFor(pathname, game, screens.flatMap((screen) => screen.paths ?? [screen.key]));
    if (section === "tasks") return screens.find((screen) => screen.key === "planner")?.to ?? `/games/${gameInstance.id}`;
    if (section === "banners") return screens.find((screen) => screen.key === "pulls")?.to ?? `/games/${gameInstance.id}`;
    return `/games/${gameInstance.id}`;
  };

  return (
    <div className="shell" style={current ? ({ "--accent": current.accent } as CSSProperties) : undefined}>
      <nav className="rail" aria-label="Scope">
        <span className="rail-logo" aria-hidden="true" />
        <Link to="/" className="rail-item rail-all" aria-label="All games" aria-current={!scope && section !== "settings" ? "page" : undefined}>
          <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">{ALL_ICON}</svg>
          <span>ALL</span>
        </Link>
        <i className="rail-rule" aria-hidden="true" />
        {instances.map((gameInstance) => {
          const on = gameInstance.gameKey === scope?.key;
          return (
            <Link
              key={gameInstance.id}
              to={targetFor(gameInstance)}
              className={`rail-item rail-game ${on ? "on" : ""} ${gameInstance.sleeping ? "asleep" : ""}`}
              aria-label={gameInstance.name}
              aria-current={on ? "page" : undefined}
              title={gameInstance.sleeping ? `${gameInstance.name} (asleep)` : gameInstance.name}
            >
              <GameMark gameKey={gameInstance.gameKey} tint={gameInstance.accent} className="rail-game-icon" />
              <span className="rail-game-name">{getGame(gameInstance.gameKey)?.shortName ?? gameInstance.name}</span>
            </Link>
          );
        })}
        <span className="rail-gap" />
        <Link to="/settings" className="rail-item" aria-label="Settings" aria-current={section === "settings" ? "page" : undefined}>
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">{SETTINGS_ICON}</svg>
          <span>SETTINGS</span>
        </Link>
      </nav>
      <div className="shell-main">
        <header className="topbar">
          {hub ? (
            <nav className="hub-tabs topbar-tabs" aria-label="Game screens">
              {hubScreens(hub.gameKey, hub.id).map((tab) => (
                <Link key={tab.key} to={tab.to} aria-current={active === tab.key ? "page" : undefined}>
                  {tab.label}
                </Link>
              ))}
            </nav>
          ) : (
            <nav className="topbar-tabs" aria-label="Sections">
              {SECTIONS.map((entry) => (
                <Link key={entry.section} to={entry.to} aria-label={entry.name} aria-current={section === entry.section ? "page" : undefined}>
                  {entry.label}
                </Link>
              ))}
            </nav>
          )}
          {section === "all" && params.get("day") && (
            <div className="topbar-view" role="status" aria-label="Viewing a past day">
              <span className="viewing">VIEWING · {dayLabel(params.get("day")!)}</span>
              <button
                type="button"
                className="btn"
                aria-label="Back to today"
                onClick={() =>
                  setParams((searchParams) => {
                    searchParams.delete("day");
                    return searchParams;
                  })
                }
              >
                Back to today
              </button>
            </div>
          )}
          <span className="topbar-date font-mono text-muted">{today()}</span>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
