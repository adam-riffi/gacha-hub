import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import type { InstanceListItem } from "../lib/types";

/** Line icons (24px grid, stroked) — one consistent set instead of emoji. */
const ICONS = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
  games: <><rect x="2.5" y="6.5" width="19" height="11" /><path d="M7 12h4M9 10v4M15.5 11h.01M18 13h.01" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="16.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  settings: <><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>,
  admin: <path d="M12 3 4.5 6v6c0 4.6 3.2 7.9 7.5 9 4.3-1.1 7.5-4.4 7.5-9V6z" />,
};

interface NavItem {
  to: string;
  label: string;
  icon: keyof typeof ICONS;
  end?: boolean;
}

const links: NavItem[] = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/library", label: "Games", icon: "games" },
  { to: "/timeline", label: "Banners & events", icon: "calendar" },
  { to: "/settings", label: "Settings", icon: "settings" },
];
const adminLink: NavItem = { to: "/admin", label: "Admin", icon: "admin" };

export function Layout({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth();
  const nav = me?.isAdmin ? [...links, adminLink] : links;
  const { data: instances } = useQuery({
    queryKey: ["instances"],
    queryFn: () => api.get<InstanceListItem[]>("/api/instances"),
    enabled: Boolean(me?.user),
  });
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark" />GACHA HUB</div>
        {nav.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end ?? false}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[l.icon]}
            </svg>
            {l.label}
          </NavLink>
        ))}

        {(instances ?? []).length > 0 && (
          <div className="nav-section">
            <div className="nav-section-title">Your games</div>
            {instances!.map((gi) => (
              <NavLink
                key={gi.id}
                to={`/games/${gi.id}`}
                className={({ isActive }) => `nav-link nav-sub ${isActive ? "active" : ""}`}
              >
                <span className="dot" style={{ background: gi.accent }} />
                {gi.name}
              </NavLink>
            ))}
          </div>
        )}
        <div className="sidebar-footer">
          <div className="row" style={{ marginBottom: 8 }}>
            {me?.user?.avatarUrl && (
              <img
                src={me.user.avatarUrl}
                alt=""
                width={26}
                height={26}
                style={{ borderRadius: "50%" }}
              />
            )}
            <span className="small">{me?.user?.username}</span>
          </div>
          <button className="btn ghost sm" onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
