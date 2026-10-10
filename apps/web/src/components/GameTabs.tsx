import { Link } from "react-router-dom";
import { getGame } from "@gacha/shared";
import { HubHeader } from "./hub/HubHeader";

type Screen = "activities" | "endgame" | "overview" | "ownership" | "characters" | "equipment" | "gear" | "materials" | "pulls";

/** What each game calls its gear sets. */
const GEAR_LABEL: Record<string, string> = {
  genshin: "Artifacts",
  hsr: "Relics",
  zzz: "Drive discs",
  wuwa: "Echoes",
};

/** The game hub's header and its tabs, on every screen of the hub. */
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
    { key: "activities", label: "Activities", to: `/games/${instanceId}` },
    { key: "endgame", label: "Endgame", to: `/games/${instanceId}/endgame` },
    // The board's order (WIREFRAMES.md Game hub): Pulls, then Characters (which replaces Ownership).
    ...(gameKey && getGame(gameKey)?.pullBanners?.length ? [{ key: "pulls" as const, label: "Pulls", to: `/games/${instanceId}/pulls` }] : []),
    { key: "characters", label: "Characters", to: `/games/${instanceId}/characters` },
    ...(hasCatalog
      ? ([
          { key: "equipment", label: "Equipment", to: `/games/${instanceId}/equipment` },
          { key: "gear", label: (gameKey && GEAR_LABEL[gameKey]) || "Gear", to: `/games/${instanceId}/gear` },
          { key: "materials", label: "Materials", to: `/games/${instanceId}/materials` },
        ] as { key: Screen; label: string; to: string }[])
      : []),
    // The old overview stays last until F10 rebuilds its parts as their own screens.
    { key: "overview", label: "Overview", to: `/games/${instanceId}/overview` },
  ];
  return (
    <>
      <HubHeader instanceId={instanceId} />
      <nav className="hub-tabs" aria-label="Game screens">
        {tabs.map((t) => (
          <Link key={t.key} to={t.to} aria-current={active === t.key ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export const gearLabel = (gameKey?: string) => (gameKey && GEAR_LABEL[gameKey]) || "Gear";
