import { useState, type ReactNode } from "react";
import { artSlotKey, getGame, type CurrencyKind } from "@gacha/shared";
import { useSlotArt } from "../lib/art";
import { communityAssetUrl } from "../lib/assets";

/** One line icon per kind of currency (Georges, round 7: "I need icons to understand quickly"), in the stat icons' style. */
const PATHS: Record<CurrencyKind, ReactNode> = {
  stamina: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  reserve: (
    <>
      <rect x="3" y="7" width="16" height="10" rx="1.5" />
      <path d="M21 10v4M7 10v4M11 10v4M15 10v4" />
    </>
  ),
  premium: <path d="M6 3h12l3 6-9 12L3 9zM3 9h18M9 3 8 9l4 12 4-12-1-6" />,
  ticket: <path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM15 7v10" />,
  standard: (
    <>
      <path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  special: (
    <>
      <path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z" />
      <path d="m12 9 1 2h2l-1.6 1.4.6 2.2-2-1.2-2 1.2.6-2.2L9 11h2z" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
    </>
  ),
};

/**
 * A currency as its game's own icon where the game names one (round 12: the keys in each manifest, from the community
 * sources), the owner's upload before it (Settings → Art), the drawn line icon of its kind otherwise or when a picture fails.
 */
export function CurrencyIcon({ kind, gameKey, currencyKey, className = "" }: { kind: CurrencyKind; gameKey?: string; currencyKey?: string; className?: string }) {
  const uploaded = useSlotArt(gameKey && currencyKey ? artSlotKey(gameKey, "currency", currencyKey) : null);
  const icon = gameKey && currencyKey ? getGame(gameKey)?.currencies.find((currency) => currency.key === currencyKey)?.icon : undefined;
  const source = gameKey && icon ? communityAssetUrl(gameKey, "material", icon) : null;
  const [failed, setFailed] = useState<string[]>([]);
  const src = [uploaded, source].find((candidate): candidate is string => Boolean(candidate) && !failed.includes(candidate!));
  if (src) {
    return <img className={`cur-icon cur-art ${className}`} data-kind={kind} src={src} alt="" loading="lazy" onError={() => setFailed([...failed, src])} />;
  }
  return (
    <svg className={`cur-icon ${className}`} data-kind={kind} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[kind]}
    </svg>
  );
}
