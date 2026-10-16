import { useState } from "react";
import { getGame } from "@gacha/shared";
import { assetUrl, communityAssetUrl } from "../lib/assets";

/**
 * A game's hero art (round 12; Georges: "add game art to everything you can"):
 * the splash of the character its manifest names, from our store first, then
 * the community source, and nothing at all when both are missing — the card
 * stays readable without it, so this never shows a placeholder.
 */
export function HeroArt({ gameKey, className = "" }: { gameKey: string; className?: string }) {
  const hero = getGame(gameKey)?.art?.hero;
  const sources = [assetUrl(gameKey, "splash", hero), communityAssetUrl(gameKey, "splash", hero)].filter((source): source is string => Boolean(source));
  const [at, setAt] = useState(0);
  const src = sources[at];
  if (!src) return null;
  return <img className={`hero-art ${className}`} src={src} alt="" loading="lazy" onError={() => setAt(at + 1)} />;
}
