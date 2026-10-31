import { Link } from "react-router-dom";
import { HubHeader } from "./hub/HubHeader";
import { ROSTER, rosterScreens, type Screen } from "../lib/hubScreens";

/**
 * The game hub's header on every screen of the hub; the screens themselves sit in the top bar since round 29 (`Layout`).
 * On a roster list, the roster's switch under the header: Characters, Teams, Weapons, the gear sets.
 */
export function GameTabs({ instanceId, active, gameKey }: { instanceId: string; active: Screen; gameKey?: string }) {
  const lists = gameKey && ROSTER.includes(active) ? rosterScreens(gameKey, instanceId) : [];
  return (
    <>
      <HubHeader instanceId={instanceId} />
      {lists.length > 0 && (
        <nav className="roster-switch" aria-label="Roster">
          {lists.map((list) => (
            <Link key={list.key} to={list.to} aria-current={active === list.key ? "page" : undefined}>
              {list.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

export { gearLabel } from "../lib/hubScreens";
