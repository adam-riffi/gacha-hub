import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getGame } from "@gacha/shared";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { hubPathFor, sectionHref, sectionOf, type ScopeGame, type Section } from "../lib/scope";
import { hubScreens } from "../lib/hubScreens";
import type { CharacterDetail, InstanceListItem } from "../lib/types";
import { GameMark } from "./GameMark";

/** Line icons, each a plain picture of its section (round 12: Georges is visually impaired; abstract shapes read badly). */
const ICONS: Record<Section, ReactNode> = {
  all: <path d="M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z" />,
  games: (
    <>
      <rect x="2.5" y="7" width="19" height="11.5" rx="5" />
      <path d="M7 11v4M5 13h4M15.5 11.5h.01M18 14h.01" />
    </>
  ),
  tasks: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="m8 12.5 3 3 5.5-6" />
    </>
  ),
  banners: <path d="M5 21V3.5h14l-3.5 5 3.5 5H5" />,
  settings: (
    <>
      <path d="M4 7.5h16M4 16.5h16" />
      <circle cx="9.5" cy="7.5" r="2.4" />
      <circle cx="14.5" cy="16.5" r="2.4" />
    </>
  ),
};
const RAIL: { section: Section; label: string; name: string }[] = [
  { section: "all", label: "ALL", name: "Home, all games" },
  { section: "games", label: "GAMES", name: "Games" },
  { section: "tasks", label: "TASKS", name: "Tasks and goals" },
  { section: "banners", label: "BANNERS", name: "Banners and events" },
];

const WEEKDAY = new Intl.DateTimeFormat("en", { weekday: "short" });
const today = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} · ${WEEKDAY.format(date).toUpperCase()}`;

/** "MON 2026-09-14" for a YYYY-MM-DD day. */
const dayLabel = (day: string) => `${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)).getDay()]} ${day}`;

/** Which way the strip's row can still move: back once scrolled, forward while cards lie past its edge. */
const reachOf = (element: HTMLElement) => ({ back: element.scrollLeft > 1, forward: element.scrollLeft + element.clientWidth < element.scrollWidth - 1 });

/** The rail of sections, the scope strip and the date (and a pinned past day on Home); the scope's game sets --accent. */
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
  // Settings has no scope: picking a game there opens its hub.
  const stripSection: Section = section === "settings" ? "games" : section;
  // The strip as a carousel (round 26, Georges: "THE TOP CARDS SHOULD BE A CAROUSEL TOO"): the arrows page the row by its
  // own width, and rest when nothing lies that way.
  const row = useRef<HTMLDivElement>(null);
  const [reach, setReach] = useState({ back: false, forward: false });
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const update = () => setReach(reachOf(element));
    update();
    const watcher = new ResizeObserver(update);
    watcher.observe(element);
    return () => watcher.disconnect();
  }, [instances.length]);
  const turn = (direction: -1 | 1) => row.current?.scrollBy({ left: direction * row.current.clientWidth, behavior: "smooth" });
  // A drag across the row scrolls it (round 27, Georges: "the top carousel should be draggable not just pressing arrows");
  // the card under the pointer does not open after a drag. The wheel scrolls it too.
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const dragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false };
    event.currentTarget.style.scrollBehavior = "auto";
  };
  const dragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const shift = event.clientX - state.x;
    if (!state.moved && Math.abs(shift) > 4) {
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (state.moved) event.currentTarget.scrollLeft = state.left - shift;
  };
  const dragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const moved = drag.current?.moved ?? false;
    drag.current = null;
    event.currentTarget.style.scrollBehavior = "";
    if (moved) {
      // The click that follows the release would open the card under the pointer: swallow that one.
      const swallow = (click: Event) => {
        click.preventDefault();
        click.stopPropagation();
      };
      event.currentTarget.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => event.currentTarget?.removeEventListener("click", swallow, { capture: true }), 0);
    }
  };
  const chevron = (direction: -1 | 1) => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={direction < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );

  const railItem = (railSection: Section, label: string, name: string) => (
    <Link key={railSection} to={sectionHref(railSection, railSection === "settings" || railSection === "all" ? null : scope)} className="rail-item" aria-label={name} aria-current={section === railSection ? "page" : undefined}>
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">{ICONS[railSection]}</svg>
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="shell" style={current ? ({ "--accent": current.accent } as CSSProperties) : undefined}>
      <nav className="rail" aria-label="Sections">
        <span className="rail-logo" aria-hidden="true" />
        {RAIL.map((railEntry) => railItem(railEntry.section, railEntry.label, railEntry.name))}
        <span className="rail-gap" />
        {railItem("settings", "SETTINGS", "Settings")}
      </nav>
      <div className="shell-main">
        <header className="topbar">
          <nav className="strip" aria-label="Scope">
            <Link to={sectionHref(stripSection, null)} className={`strip-all ${scope ? "" : "on"}`} aria-current={scope ? undefined : "page"}>
              Overview
            </Link>
            <i className="strip-rule" aria-hidden="true" />
            <button type="button" className="strip-arrow" aria-label="Earlier games" disabled={!reach.back} onClick={() => turn(-1)}>
              {chevron(-1)}
            </button>
            <div
              className="strip-games"
              ref={row}
              onScroll={(event) => setReach(reachOf(event.currentTarget))}
              onPointerDown={dragStart}
              onPointerMove={dragMove}
              onPointerUp={dragEnd}
              onPointerCancel={dragEnd}
              onDragStart={(event) => event.preventDefault()} // a card is a link: its own drag would cut the pointer sequence short
              onWheel={(event) => {
                if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.currentTarget.scrollLeft += event.deltaY;
              }}
            >
              {instances.map((gameInstance) => {
                const on = gameInstance.gameKey === scope?.key;
                return (
                  <Link
                    key={gameInstance.id}
                    to={
                      section === "games" && pathname !== "/library"
                        ? hubPathFor(pathname, { key: gameInstance.gameKey, instanceId: gameInstance.id }, hubScreens(gameInstance.gameKey, gameInstance.id).map((screen) => screen.key))
                        : sectionHref(stripSection, { key: gameInstance.gameKey, instanceId: gameInstance.id })
                    }
                    className={`strip-game ${on ? "on" : ""} ${gameInstance.sleeping ? "asleep" : ""}`}
                    aria-label={gameInstance.name}
                    aria-current={on ? "page" : undefined}
                    title={gameInstance.sleeping ? `${gameInstance.name} (asleep)` : gameInstance.name}
                  >
                    {/* Its emblem and its short name; one size for every card, the picked one too (round 26). */}
                    <GameMark gameKey={gameInstance.gameKey} tint={gameInstance.accent} className="strip-icon" />
                    <span className="strip-name">{getGame(gameInstance.gameKey)?.shortName ?? gameInstance.name}</span>
                  </Link>
                );
              })}
            </div>
            <button type="button" className="strip-arrow" aria-label="Later games" disabled={!reach.forward} onClick={() => turn(1)}>
              {chevron(1)}
            </button>
          </nav>
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
