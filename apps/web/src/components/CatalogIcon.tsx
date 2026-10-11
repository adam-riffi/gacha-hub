import { elementColor, type ArtKind } from "@gacha/shared";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { GameIcon } from "./GameIcon";

/** A catalog entry's icon (character, weapon, gear set, material…), named for hover and screen readers, tinted to its element. */
export function CatalogIcon({ gameKey, kind, icon, name, tag, className }: { gameKey: string; kind: ArtKind; icon?: string | null; name: string; tag?: string | null; className?: string }) {
  return <GameIcon src={assetUrl(gameKey, kind, icon)} fallback={communityAssetUrl(gameKey, kind, icon)} alt={name} tint={elementColor(gameKey, tag) ?? undefined} className={className} />;
}
