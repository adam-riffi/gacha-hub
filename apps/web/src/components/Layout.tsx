import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import type { InstanceListItem } from "../lib/types";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const links: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "🏠", end: true },
  { to: "/library", label: "Games", icon: "🎮" },
  { to: "/tasks", label: "Tasks", icon: "✅" },
  { to: "/timeline", label: "Banners & events", icon: "📅" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];
const adminLink: NavItem = { to: "/admin", label: "Admin", icon: "🛠️" };

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
        <div className="brand">◈ Gacha Tracker</div>
        {nav.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end ?? false}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span>{l.icon}</span>
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
