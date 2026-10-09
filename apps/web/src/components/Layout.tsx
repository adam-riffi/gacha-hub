import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getGame } from "@gacha/shared";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { sectionHref, sectionOf, type ScopeGame, type Section } from "../lib/scope";
import type { CharacterDetail, InstanceListItem } from "../lib/types";

/** 18 px line icons, 1.5 px stroke (VISUAL-DESIGN.md §7). */
const ICONS: Record<Section, ReactNode> = {
  all: <path d="M2 2h6v6H2zM10 2h6v6h-6zM2 10h6v6H2zM10 10h6v6h-6z" />,
  games: <path d="M9 1.5L16.5 9L9 16.5L1.5 9z" />,
  tasks: <path d="M9 2L16.5 16H1.5z" />,
  banners: <path d="M2 3h14v12H2zM2 7h14" />,
  admin: <path d="M9 1.8 3 4.2v4.6c0 3.6 2.6 6.2 6 7.4 3.4-1.2 6-3.8 6-7.4V4.2z" />,
  settings: <path d="M2 5h14M2 13h14M5 3v4M12 11v4" />,
};
const RAIL: { section: Section; label: string; name: string }[] = [
  { section: "all", label: "ALL", name: "Home, all games" },
  { section: "games", label: "GAMES", name: "Games" },
  { section: "tasks", label: "TASKS", name: "Tasks and goals" },
  { section: "banners", label: "BANNERS", name: "Banners and events" },
];

const WEEKDAY = new Intl.DateTimeFormat("en", { weekday: "short" });
const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} · ${WEEKDAY.format(d).toUpperCase()}`;

/** The rail of sections, the scope strip and the date; the scope's game sets --accent. */
export function Layout({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const section = sectionOf(pathname);
  const { data: instances = [] } = useQuery({
    queryKey: ["instances"],
    queryFn: () => api.get<InstanceListItem[]>("/api/instances"),
    enabled: Boolean(me?.user),
  });
  const characterId = pathname.startsWith("/characters/") ? pathname.split("/")[2] : undefined;
  const { data: character } = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => api.get<CharacterDetail>(`/api/characters/${characterId}`),
    enabled: Boolean(characterId),
  });

  const hubId = pathname.startsWith("/games/") ? pathname.split("/")[2] : undefined;
  const scopeKey = section === "games" ? (instances.find((i) => i.id === hubId)?.gameKey ?? character?.gameKey) : params.get("game");
  const current = instances.find((i) => i.gameKey === scopeKey);
  const scope: ScopeGame | null = current ? { key: current.gameKey, instanceId: current.id } : null;
  // Settings and Admin have no scope: picking a game there opens its hub.
  const stripSection: Section = section === "settings" || section === "admin" ? "games" : section;

  const railItem = (s: Section, label: string, name: string) => (
    <Link key={s} to={sectionHref(s, s === "settings" || s === "admin" ? null : scope)} className="rail-item" aria-label={name} aria-current={section === s ? "page" : undefined}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">{ICONS[s]}</svg>
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="shell" style={current ? ({ "--accent": current.accent } as CSSProperties) : undefined}>
      <nav className="rail" aria-label="Sections">
        <span className="rail-logo" aria-hidden="true" />
        {RAIL.map((r) => railItem(r.section, r.label, r.name))}
        <span className="rail-gap" />
        {me?.isAdmin && railItem("admin", "ADMIN", "Admin")}
        {railItem("settings", "SETTINGS", "Settings")}
      </nav>
      <div className="shell-main">
        <header className="topbar">
          <nav className="strip" aria-label="Scope">
            <Link to={sectionHref(stripSection, null)} className={`strip-all ${scope ? "" : "on"}`} aria-current={scope ? undefined : "page"}>
              Overview
            </Link>
            <i className="strip-rule" aria-hidden="true" />
            <div className="strip-games">
              {instances.map((gi) => {
                const on = gi.gameKey === scope?.key;
                return (
                  <Link
                    key={gi.id}
                    to={sectionHref(stripSection, { key: gi.gameKey, instanceId: gi.id })}
                    className={`strip-game ${on ? "on" : ""} ${gi.sleeping ? "asleep" : ""}`}
                    aria-label={gi.name}
                    aria-current={on ? "page" : undefined}
                    title={gi.sleeping ? `${gi.name} (asleep)` : gi.name}
                  >
                    <i className="kq" style={{ background: gi.accent }} aria-hidden="true" />
                    {getGame(gi.gameKey)?.shortName ?? gi.name}
                  </Link>
                );
              })}
            </div>
          </nav>
          <span className="topbar-date mn mu">{today()}</span>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
