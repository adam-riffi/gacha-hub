import { Link } from "react-router-dom";
import { HubHeader } from "./hub/HubHeader";
import { hubScreens, type Screen } from "../lib/hubScreens";

/** The game hub's header and its tabs, on every screen of the hub. */
export function GameTabs({ instanceId, active, gameKey }: { instanceId: string; active: Screen; gameKey?: string }) {
  const tabs = gameKey ? hubScreens(gameKey, instanceId) : [];
  return (
    <>
      <HubHeader instanceId={instanceId} />
      <nav className="hub-tabs" aria-label="Game screens">
        {tabs.map((tab) => (
          <Link key={tab.key} to={tab.to} aria-current={active === tab.key ? "page" : undefined}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export { gearLabel } from "../lib/hubScreens";
