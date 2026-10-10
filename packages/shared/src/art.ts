import { getGame } from "./games/index.js";

/** Kinds of catalog art the UI asks for. */
export type ArtKind = "character" | "portrait" | "weapon" | "gear" | "material" | "talent" | "constellation";

/** Public folders of the web app; other root-relative keys are source-internal paths (e.g. Unreal's "/Game/…"). */
const OWN_PATHS = /^\/(assets|games|uploads)\//;

/**
 * Where we host a catalog icon: `{base}/{game}/{kind}/{key}.webp`. Full URLs and
 * our own public paths pass through; source-internal paths that no server hosts
 * return null, so the UI goes straight to its placeholder.
 */
export function assetPath(base: string, gameKey: string, kind: ArtKind, key?: string | null): string | null {
  if (!key) return null;
  if (/^https?:\/\//.test(key) || OWN_PATHS.test(key)) return key;
  if (key.startsWith("/")) return null;
  return `${base}/${gameKey}/${kind}/${encodeURIComponent(key)}.webp`;
}

/**
 * The same icon from a public community CDN, used when we host no copy: each
 * game's manifest names a URL per art kind (Enka for Genshin, Yatta for HSR).
 * ponytail: hotlinks third parties; mirror into our own store (VITE_ASSET_BASE,
 * F12) if either blocks us or goes down.
 */
export function communityArtUrl(gameKey: string, kind: ArtKind, key?: string | null): string | null {
  const template = key ? getGame(gameKey)?.manifest.art[kind] : undefined;
  return template ? template.replace("{key}", encodeURIComponent(key!)) : null;
}
