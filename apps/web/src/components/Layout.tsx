import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";

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
