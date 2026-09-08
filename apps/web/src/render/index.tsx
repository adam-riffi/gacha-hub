import type { SheetProps } from "./types";
import { GenshinSheet } from "../games/genshin/Sheet";
import { HsrSheet } from "../games/hsr/Sheet";
import { ZzzSheet } from "../games/zzz/Sheet";
import { EndfieldSheet } from "../games/endfield/Sheet";

/** Game keys that have a hardcoded, bespoke character sheet. */
const SHEET_KEYS = new Set(["genshin", "hsr", "zzz", "endfield"]);

export function hasSheet(gameKey: string): boolean {
  return SHEET_KEYS.has(gameKey);
}

// Each sheet has its own Doc type; the host passes the matching document.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HostProps = SheetProps<any> & { gameKey: string };

/**
 * Stable dispatcher component: renders the bespoke sheet for a game key via
 * statically imported components (no component values created in render).
 * Add a game by importing its sheet and adding a case + key above.
 */
export function GameSheet({ gameKey, ...props }: HostProps) {
  switch (gameKey) {
    case "genshin":
      return <GenshinSheet {...props} />;
    case "hsr":
      return <HsrSheet {...props} />;
    case "zzz":
      return <ZzzSheet {...props} />;
    case "endfield":
      return <EndfieldSheet {...props} />;
    default:
      return null;
  }
}

export type { SheetProps };
