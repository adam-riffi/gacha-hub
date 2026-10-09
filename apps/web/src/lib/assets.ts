import { assetPath, type ArtKind } from "@gacha/shared";

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

/** character = square avatar, portrait = large art, gear = artifact / relic / disc set. */
export type AssetKind = ArtKind;

/** Resolve a catalog asset key to a URL in our store, or null (see `assetPath`). */
export const assetUrl = (gameKey: string, kind: AssetKind, key?: string | null): string | null => assetPath(BASE, gameKey, kind, key);

/** The key of a unit's full art where the community CDN names it apart from its icon (Genshin gacha splashes). */
export const splashKey = (gameKey: string, icon?: string | null): string | null | undefined =>
  gameKey === "genshin" && icon?.startsWith("UI_AvatarIcon_") ? icon.replace("UI_AvatarIcon_", "UI_Gacha_AvatarImg_") : icon;

/** Fallback when we host no copy (<GameIcon fallback>): Enka for Genshin, Yatta for HSR. */
export { communityArtUrl as communityAssetUrl } from "@gacha/shared";
