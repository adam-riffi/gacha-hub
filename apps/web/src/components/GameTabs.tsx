import { HubHeader } from "./hub/HubHeader";
import type { Screen } from "../lib/hubScreens";

/** The game hub's header on every screen of the hub; the screens themselves sit in the top bar since round 29 (`Layout`). */
export function GameTabs({ instanceId }: { instanceId: string; active: Screen; gameKey?: string }) {
  return <HubHeader instanceId={instanceId} />;
}

export { gearLabel } from "../lib/hubScreens";
