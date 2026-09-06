import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";

const links = [
  { to: "/", label: "Dashboard", icon: "🏠", end: true },
  { to: "/library", label: "Games", icon: "🎮" },
  { to: "/tasks", label: "Tasks", icon: "✅" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">◈ Gacha Tracker</div>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
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
