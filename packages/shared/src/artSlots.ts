import type { GameDefinition } from "./games/types.js";
import { elementIconUrl, weaponTypeIconUrl } from "./elements.js";

/** The app's own lists, then the catalog kinds an entry without a source falls under. */
export type ArtSlotKind = "logo" | "key-art" | "mode" | "battle-pass" | "monthly-pass" | "banner" | "shop" | "currency" | "task" | "element" | "weapon-type" | "character" | "weapon" | "gear" | "material";

/** What a game's catalog adds to its slots: its elements and weapon types, and its entries no source has. */
export type CatalogSlots = { elements: string[]; weaponTypes: string[]; gaps?: { kind: "character" | "weapon" | "gear" | "material"; name: string }[] };

/** A picture a game's cards can show that no catalog names: the owner uploads it unless a source has it. */
export interface ArtSlot {
  key: string;
  gameKey: string;
  kind: ArtSlotKind;
  name: string;
  /** An icon (256 × 256) or a wide picture (1280 × 720). */
  shape: "square" | "wide";
  /** A community source already shows it; an upload replaces it. */
  sourced: boolean;
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const artSlotKey = (gameKey: string, kind: ArtSlotKind, item?: string) => (item ? `${gameKey}/${kind}/${slug(item)}` : `${gameKey}/${kind}`);

/**
 * Every picture slot of a game, most visible first (Georges, 2026-10-17: "an exhaustive list of assets you need"):
 * its logo, endgame modes, battle pass, 30-day pass, banners, monthly shops, currencies, tasks, then its catalog's
 * elements and weapon types, and its entries without an icon or of a kind its game has no source for. A task that resets
 * with a shop or a mode shows that one's picture.
 */
export function artSlots(game: GameDefinition, tags: CatalogSlots = { elements: [], weaponTypes: [] }): ArtSlot[] {
  const { manifest } = game;
  const slot = (kind: ArtSlotKind, name: string, item?: string, sourced = false, shape: ArtSlot["shape"] = "square"): ArtSlot => ({ key: artSlotKey(game.key, kind, item), gameKey: game.key, kind, name, shape, sourced });
  return [
    slot("logo", `${game.name} logo`),
    // Its official key art (round 16, Georges: "for banners or game cards you can use real game art"): the hero of its cards.
    slot("key-art", `${game.name} key art`, undefined, false, "wide"),
    ...manifest.endgame.map((mode) => slot("mode", mode.name, mode.key)),
    ...(manifest.battlePass ? [slot("battle-pass", manifest.battlePass.name, undefined, false, "wide")] : []),
    ...(manifest.monthlyPass ? [slot("monthly-pass", manifest.monthlyPass.name)] : []),
    ...(game.pullBanners ?? []).map((banner) => slot("banner", banner.label, banner.key, false, "wide")),
    ...manifest.monthlyShops.map((shop) => slot("shop", shop.name, shop.key)),
    ...game.currencies.map((currency) => slot("currency", currency.label, currency.key, Boolean(currency.icon))),
    ...game.defaultTasks.filter((task) => !task.anchorKey).map((task) => slot("task", task.title, task.key)),
    ...tags.elements.map((tag) => slot("element", tag, tag, Boolean(elementIconUrl(game.key, tag)))),
    ...tags.weaponTypes.map((type) => slot("weapon-type", type, type, Boolean(weaponTypeIconUrl(game.key, type)))),
    ...(tags.gaps ?? []).map((gap) => slot(gap.kind, gap.name, gap.name)),
  ];
}
