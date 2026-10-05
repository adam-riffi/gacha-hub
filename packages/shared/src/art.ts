/** Kinds of catalog art the UI asks for. */
export type ArtKind = "character" | "portrait" | "weapon" | "gear" | "material" | "talent" | "constellation";

const YATTA = "https://sr.yatta.moe/hsr/assets/UI";
const HSR_PATHS: Partial<Record<ArtKind, string>> = {
  character: "avatar/medium",
  portrait: "avatar/large",
  weapon: "equipment/medium",
  gear: "relic",
  material: "item",
};
const ENKA_KINDS: ReadonlySet<ArtKind> = new Set(["character", "portrait", "weapon", "gear", "material"]);

/**
 * The same icon from a public community CDN, used when we host no copy:
 * Enka serves Genshin art under the catalog keys, Yatta serves HSR art by id.
 * ponytail: hotlinks third parties; mirror into our own store (VITE_ASSET_BASE)
 * if either blocks us or goes down.
 */
export function communityArtUrl(gameKey: string, kind: ArtKind, key?: string | null): string | null {
  if (!key) return null;
  const file = `${encodeURIComponent(key)}.png`;
  if (gameKey === "genshin" && ENKA_KINDS.has(kind)) return `https://enka.network/ui/${file}`;
  const hsrPath = gameKey === "hsr" ? HSR_PATHS[kind] : undefined;
  return hsrPath ? `${YATTA}/${hsrPath}/${file}` : null;
}
