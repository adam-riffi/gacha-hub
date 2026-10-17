import type { GameDefinition } from "./games/types.js";
import { elementIconUrl, weaponTypeIconUrl } from "./elements.js";

export type ArtSlotKind = "logo" | "mode" | "battle-pass" | "monthly-pass" | "banner" | "shop" | "currency" | "task" | "element" | "weapon-type";

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
 * elements and weapon types. A task that resets with a shop or a mode shows that one's picture.
 */
export function artSlots(game: GameDefinition, tags: { elements: string[]; weaponTypes: string[] } = { elements: [], weaponTypes: [] }): ArtSlot[] {
  const { manifest } = game;
  const slot = (kind: ArtSlotKind, name: string, item?: string, sourced = false, shape: ArtSlot["shape"] = "square"): ArtSlot => ({ key: artSlotKey(game.key, kind, item), gameKey: game.key, kind, name, shape, sourced });
  return [
    slot("logo", `${game.name} logo`),
    ...manifest.endgame.map((mode) => slot("mode", mode.name, mode.key)),
    ...(manifest.battlePass ? [slot("battle-pass", manifest.battlePass.name, undefined, false, "wide")] : []),
    ...(manifest.monthlyPass ? [slot("monthly-pass", manifest.monthlyPass.name)] : []),
    ...(game.pullBanners ?? []).map((banner) => slot("banner", banner.label, banner.key, false, "wide")),
    ...manifest.monthlyShops.map((shop) => slot("shop", shop.name, shop.key)),
    ...game.currencies.map((currency) => slot("currency", currency.label, currency.key, Boolean(currency.icon))),
    ...game.defaultTasks.filter((task) => !task.anchorKey).map((task) => slot("task", task.title, task.key)),
    ...tags.elements.map((tag) => slot("element", tag, tag, Boolean(elementIconUrl(game.key, tag)))),
    ...tags.weaponTypes.map((type) => slot("weapon-type", type, type, Boolean(weaponTypeIconUrl(game.key, type)))),
  ];
}
