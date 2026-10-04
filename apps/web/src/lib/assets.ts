/**
 * Asset resolver — turns a catalog asset *key* (a source-provided filename such
 * as `UI_AvatarIcon_Arlecchino`) into a URL, without hardcoding where the images
 * actually live. Point `VITE_ASSET_BASE` at whatever hosts them:
 *
 *   - unset / "/assets"          → apps/web/public/assets (served by the CDN in prod)
 *   - "https://<blob>.public…"   → Vercel Blob / any CDN
 *   - "https://…r2.dev"          → Cloudflare R2, S3, etc.
 *
 * Files are expected at `{BASE}/{gameKey}/{kind}/{key}.webp`. Missing files are
 * handled at render time by <GameIcon>, which falls back to a placeholder tile —
 * so the UI is fully functional before a single real asset exists.
 */
const BASE = (import.meta.env.VITE_ASSET_BASE ?? "/assets").replace(/\/+$/, "");

export type AssetKind =
  | "character" // square avatar icon
  | "portrait" // large splash / card art
  | "weapon"
  | "gear" // artifact / relic / disc set
  | "material"
  | "talent"
  | "constellation";

/**
 * Resolve a catalog asset key to a URL, or `null` when there is no key.
 * If the key is already an absolute URL or root-relative path, it's used as-is
 * (some game sources ship full URLs), so this stays correct across games.
 */
export function assetUrl(gameKey: string, kind: AssetKind, key?: string | null): string | null {
  if (!key) return null;
  if (/^https?:\/\//.test(key) || key.startsWith("/")) return key;
  return `${BASE}/${gameKey}/${kind}/${encodeURIComponent(key)}.webp`;
}

/**
 * Fallback: the same icon from a public community CDN, used when we host no
 * copy (<GameIcon fallback>). Enka serves Genshin character/weapon icons under
 * the exact catalog keys. ponytail: hotlinks a third party; mirror into our own
 * store (VITE_ASSET_BASE) if Enka ever blocks or goes down.
 */
export function communityAssetUrl(gameKey: string, kind: AssetKind, key?: string | null): string | null {
  if (!key || gameKey !== "genshin") return null;
  if (kind === "character" || kind === "portrait" || kind === "weapon" || kind === "gear") {
    return `https://enka.network/ui/${encodeURIComponent(key)}.png`;
  }
  return null;
}
