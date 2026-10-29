import { useState, type CSSProperties, type ReactNode } from "react";
import { artSlotKey, getGame } from "@gacha/shared";
import { useSlotArt, useSlotInverted } from "../lib/art";

/**
 * Each game's drawn emblem (round 12; Georges: "i need icons and visuals
 * first"): a line mark we author, so it is always there, crisp at any size and
 * tinted by the game's accent. Real logos are the owner's to drop into the
 * store later (ASSETS.md); this is the mark the app itself draws.
 */
const EMBLEMS: Record<string, ReactNode> = {
  // A primogem: the four-pointed star, a facet line through it.
  genshin: (
    <>
      <path d="M12 2.5 15 9l6.5 3L15 15l-3 6.5L9 15l-6.5-3L9 9z" />
      <path d="M12 7.5 13.8 12 12 16.5 10.2 12z" />
    </>
  ),
  // The Astral Express: a warp star on its orbit.
  hsr: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="m12 7.8 1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" />
      <path d="M20.5 7.5a9.5 9.5 0 0 0-13-3M3.5 16.5a9.5 9.5 0 0 0 13 3" />
    </>
  ),
  // New Eridu's signal: a bolt on a screen.
  zzz: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M13.5 7 9 12.8h3L10.5 17l4.5-5.8h-3z" />
    </>
  ),
  // A resonance: the sound wave.
  wuwa: (
    <>
      <path d="M3 12c2 0 2-4.5 4-4.5S9 15 11 15s2-7.5 4-7.5S17 14 19 14" />
      <circle cx="21" cy="12" r="1.2" />
    </>
  ),
  // Talos II industry: the hexagon around a core.
  endfield: (
    <>
      <path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4z" />
      <path d="M12 8.2 15.4 12 12 15.8 8.6 12z" />
    </>
  ),
  // A roll of the dice.
  nte: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8.2 8.2h.01M15.8 8.2h.01M12 12h.01M8.2 15.8h.01M15.8 15.8h.01" />
    </>
  ),
};

const FALLBACK = (
  <>
    <rect x="3" y="7" width="18" height="11" rx="5" />
    <path d="M7.5 12.5h3M9 11v3M15 12h0M17 14h0" />
  </>
);

/**
 * A game's emblem, tinted by its accent (or the colour given), sized by the CSS around it; `named` labels it for screen
 * readers. The owner's pictures (Settings → Art) take its place: small marks show the game's icon (`art="icon"`, the
 * default), big spots its logo (`art="logo"`, the icon when there is none). Round 17 (Georges): a wordmark at 30 px reads
 * as nothing; the app icon is what he recognises.
 */
export function GameMark({ gameKey, tint, named = false, className = "", art = "icon" }: { gameKey: string; tint?: string | null; named?: boolean; className?: string; art?: "icon" | "logo" }) {
  const game = getGame(gameKey);
  const accent = tint ?? game?.accent;
  const icon = useSlotArt(artSlotKey(gameKey, "icon"));
  // A logo only from the owner's upload (round 25, Georges: "not a fan of the genshin icon", the wiki's wordmark): a source's
  // wordmark never stands in, the game's icon does.
  const logo = useSlotArt(artSlotKey(gameKey, "logo"), { sources: false });
  // The big spots take the logo, then the icon; the small marks the icon. A picture whose host does not answer gives way
  // to the next, and the drawn emblem comes only when none is left (round 22: a source shown straight from its host).
  const [failed, setFailed] = useState<string[]>([]);
  const picture = (art === "logo" ? [logo, icon] : [icon]).find((candidate): candidate is string => Boolean(candidate) && !failed.includes(candidate!));
  const inverted = useSlotInverted(artSlotKey(gameKey, picture && picture === logo ? "logo" : "icon"));
  // A wordmark (wider than twice its height) is tagged, for the spots that size to it.
  const [wide, setWide] = useState(false);
  if (picture) {
    return (
      <img
        className={`game-mark is-art ${inverted ? "is-inverted" : ""} ${wide ? "is-wide" : ""} ${className}`}
        src={picture}
        alt={named ? `${game?.name ?? gameKey} logo` : ""}
        onLoad={(event) => setWide(event.currentTarget.naturalWidth > event.currentTarget.naturalHeight * 2)}
        onError={() => setFailed([...failed, picture])}
      />
    );
  }
  return (
    <svg
      className={`game-mark ${className}`}
      viewBox="0 0 24 24"
      {...(named ? { role: "img", "aria-label": `${game?.name ?? gameKey} emblem` } : { "aria-hidden": true })}
      style={accent ? ({ "--mark": accent } as CSSProperties) : undefined}
    >
      {EMBLEMS[gameKey] ?? FALLBACK}
    </svg>
  );
}
