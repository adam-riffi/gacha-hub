import { Link } from "react-router-dom";

type Screen = "overview" | "ownership" | "equipment" | "gear" | "materials";

/** What each game calls its gear sets. */
const GEAR_LABEL: Record<string, string> = {
  genshin: "Artifacts",
  hsr: "Relics",
  zzz: "Drive discs",
  wuwa: "Echoes",
};

/** Sub-navigation for a game's screens, so you can move between them directly. */
export function GameTabs({
  instanceId,
  active,
  gameKey,
  hasCatalog = true,
}: {
  instanceId: string;
  active: Screen;
  gameKey?: string;
  hasCatalog?: boolean;
}) {
  const tabs: { key: Screen; label: string; to: string }[] = [
    { key: "overview", label: "Overview", to: `/games/${instanceId}` },
    ...(hasCatalog
      ? ([
          { key: "ownership", label: "Ownership", to: `/games/${instanceId}/ownership` },
          { key: "equipment", label: "Equipment", to: `/games/${instanceId}/equipment` },
          { key: "gear", label: (gameKey && GEAR_LABEL[gameKey]) || "Gear", to: `/games/${instanceId}/gear` },
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

export const gearLabel = (gameKey?: string) => (gameKey && GEAR_LABEL[gameKey]) || "Gear";
