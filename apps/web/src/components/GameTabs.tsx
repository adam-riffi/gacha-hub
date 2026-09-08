import { Link } from "react-router-dom";

type Screen = "overview" | "ownership" | "equipment" | "materials";

/** Sub-navigation for a game's screens, so you can move between them directly. */
export function GameTabs({
  instanceId,
  active,
  hasCatalog = true,
}: {
  instanceId: string;
  active: Screen;
  hasCatalog?: boolean;
}) {
  const tabs: { key: Screen; label: string; to: string }[] = [
    { key: "overview", label: "Overview", to: `/games/${instanceId}` },
    ...(hasCatalog
      ? ([
          { key: "ownership", label: "Ownership", to: `/games/${instanceId}/ownership` },
          { key: "equipment", label: "Equipment", to: `/games/${instanceId}/equipment` },
          { key: "materials", label: "Materials", to: `/games/${instanceId}/materials` },
        ] as { key: Screen; label: string; to: string }[])
      : []),
  ];
  return (
    <div className="row" style={{ gap: 6 }}>
      {tabs.map((t) => (
        <Link key={t.key} to={t.to} className={`btn sm ${active === t.key ? "primary" : ""}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
