import { useState } from "react";
import { artSlotKey, getGame } from "@gacha/shared";
import { useSlotArt } from "../lib/art";
import { assetUrl, communityAssetUrl } from "../lib/assets";

/**
 * A game's hero art (round 12; Georges: "add game art to everything you can"):
 * the splash of the character its manifest names, from our store first, then
 * the community source, and nothing at all when both are missing — the card
 * stays readable without it, so this never shows a placeholder. Round 16: the
 * game's own key art (Settings → Art) comes first when the owner has put one.
 */
export function HeroArt({ gameKey, className = "" }: { gameKey: string; className?: string }) {
  const keyArt = useSlotArt(artSlotKey(gameKey, "key-art"));
  const hero = getGame(gameKey)?.art?.hero;
  const sources = [keyArt, assetUrl(gameKey, "splash", hero), communityAssetUrl(gameKey, "splash", hero)].filter((source): source is string => Boolean(source));
  const [at, setAt] = useState(0);
  const src = sources[at];
  if (!src) return null;
  return <img className={`hero-art ${className}`} src={src} alt="" loading="lazy" onError={() => setAt(at + 1)} />;
}
