import { getGame } from "./games/index.js";
import type { GameDefinition } from "./games/types.js";
import type { Catalog } from "./catalog/types.js";

/** Kinds of catalog art the UI asks for. */
/** splash = full-length character art (Genshin's gacha art, Star Rail's large art; ADR 0006). */
export type ArtKind = "character" | "portrait" | "splash" | "weapon" | "gear" | "material" | "talent" | "constellation";

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

/**
 * A character's splash art key: its own when the catalog names one (Wuthering
 * Waves), Genshin's gacha art by the icon's name, otherwise the icon's.
 */
export const splashKey = (gameKey: string, icon?: string | null, splash?: string | null): string | null | undefined =>
  splash || (gameKey === "genshin" && icon?.startsWith("UI_AvatarIcon_") ? icon.replace("UI_AvatarIcon_", "UI_Gacha_AvatarImg_") : icon);

/** One image the mirror copies into our store (ADR 0006): its kind and key, where it comes from, where it goes. */
export interface ArtJob {
  kind: ArtKind;
  key: string;
  source: string;
  path: string;
}

/**
 * Every catalog image of a game that our store can hold (ADR 0006): each
 * character's icon, large and splash art, each weapon, each gear set and all
 * its pieces, each material, from the source the manifest names per kind.
 * Keys without a source, full URLs and source-internal paths are left out.
 */
export function artJobs(game: GameDefinition, catalog: Catalog): ArtJob[] {
  const keys: [ArtKind, string | null | undefined][] = [
    ...catalog.characters.flatMap((c): [ArtKind, string | null | undefined][] => [["character", c.icon], ["portrait", c.icon], ["splash", splashKey(game.key, c.icon, c.splash)]]),
    ...catalog.weapons.map((w): [ArtKind, string | undefined] => ["weapon", w.icon]),
    ...catalog.gear.flatMap((g): [ArtKind, string | undefined][] => [["gear", g.icon], ...Object.values((g.extra?.pieceIcons ?? {}) as Record<string, string>).map((k): [ArtKind, string] => ["gear", k])]),
    ...catalog.materials.map((m): [ArtKind, string | undefined] => ["material", m.icon]),
  ];
  const jobs = new Map<string, ArtJob>();
  for (const [kind, key] of keys) {
    const source = communityArtUrl(game.key, kind, key);
    const own = assetPath("", game.key, kind, key);
    if (!key || !source || !own?.startsWith(`/${game.key}/`)) continue;
    const path = own.slice(1);
    if (!jobs.has(path)) jobs.set(path, { kind, key, source, path });
  }
  return [...jobs.values()];
}
