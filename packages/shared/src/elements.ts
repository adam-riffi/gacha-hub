/**
 * Each element's colour as its game paints it (Georges, 2026-10-11: "follow
 * in-game logic; Endfield's Electric is yellow"), light enough for dark text
 * on it. Each game has its own map, since the same word is not the same
 * colour everywhere (Electric is yellow in Endfield, blue in ZZZ).
 */
const BY_GAME: Record<string, Record<string, string>> = {
  genshin: {
    Anemo: "#74e0c2",
    Geo: "#f2c55c",
    Electro: "#c79cff",
    Dendro: "#a8d86a",
    Hydro: "#6cc4ff",
    Pyro: "#ff8a6a",
    Cryo: "#a3e9f5",
  },
  hsr: {
    Physical: "#d6d6d6",
    Fire: "#ff8a6a",
    Ice: "#9fdcf5",
    Lightning: "#d39aff",
    Wind: "#7fe0b0",
    Quantum: "#a99cff",
    Imaginary: "#ffe27a",
  },
  zzz: {
    Physical: "#f5c95a",
    Fire: "#ff8a5a",
    Ice: "#8ed8f8",
    Electric: "#5aaeff",
    Ether: "#ff7ad6",
    Wind: "#7fe0b0",
    Lumiflux: "#ffe08a",
  },
  wuwa: {
    Glacio: "#8fd6f5",
    Fusion: "#ff8a5c",
    Electro: "#c79cff",
    Aero: "#6fe3b9",
    Spectro: "#f2df7a",
    Havoc: "#e8749f",
  },
  endfield: {
    Physical: "#d6d6d6",
    Heat: "#ff8a5a",
    Cryo: "#8fd6f5",
    Electric: "#ffd84a",
    Nature: "#9be06e",
  },
  // Sampled from the game's own element icons (Hakushin's assets): each icon's most saturated tenth, lightened for dark text.
  nte: {
    Incantation: "#cb8793",
    Chaos: "#a991bf",
    Lakshana: "#d29a39",
    Nature: "#30ad8c",
    Psyche: "#729dcd",
    Cosmos: "#b0aea4",
  },
};

/** Where a game's icons for a kind of tag live: a URL with `{key}`, and the source's own key where the game's word differs. */
type IconSource = { url: string; keys?: Record<string, string> };

const STARRAILRES = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/dbe8cdfcfb0bf657b9fe1cf92d5537f118ccb487/icon";

/**
 * Each game's element icons (Georges: names shown as icons), every URL checked by hand on 2026-10-17 (ASSETS.md):
 * Genshin from Yatta (Enka has no Cryo), Star Rail from StarRailRes at a pinned commit, Zenless and NTE from the
 * Hakushin assets, Wuthering Waves from wuthery (keys from WutheringData's ElementInfo). Endfield has no source yet.
 */
const ELEMENT_ICONS: Record<string, IconSource> = {
  genshin: { url: "https://gi.yatta.moe/assets/UI/UI_Buff_Element_{key}.png", keys: { Pyro: "Fire", Hydro: "Water", Anemo: "Wind", Electro: "Electric", Dendro: "Grass", Cryo: "Ice", Geo: "Rock" } },
  hsr: { url: `${STARRAILRES}/element/{key}.png`, keys: { Lightning: "Thunder" } },
  zzz: { url: "https://static.nanoka.cc/assets/zzz/Icon{key}.webp" },
  wuwa: { url: "https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconElement128/T_IconElement{key}1.png", keys: { Glacio: "Ice", Fusion: "Fire", Electro: "Thunder", Aero: "Wind", Spectro: "Light", Havoc: "Dark" } },
  nte: { url: "https://static.nanoka.cc/assets/nte/Game/UI/UI/biandui/YH_UI_zudui_shaixuan_{key}.webp", keys: { Chaos: "01", Nature: "02", Psyche: "03", Incantation: "04", Lakshana: "05", Cosmos: "06" } },
};

/** Each game's weapon-type icons (Star Rail's paths, Zenless's specialties), checked the same way; no source has Wuthering Waves', Endfield's or NTE's. */
const WEAPON_TYPE_ICONS: Record<string, IconSource> = {
  genshin: { url: "https://enka.network/ui/UI_GachaTypeIcon_{key}.png", keys: { Polearm: "Pole" } },
  hsr: { url: `${STARRAILRES}/path/{key}.png`, keys: { "The Hunt": "Hunt" } },
  zzz: { url: "https://static.nanoka.cc/assets/zzz/Icon{key}.webp" },
};

const iconUrl = (source: IconSource | undefined, tag: string | null | undefined) => (source && tag && tag !== "None" ? source.url.replace("{key}", source.keys?.[tag] ?? tag) : null);

/** An element's icon in this game, or null where no source has it (the name stays). */
export const elementIconUrl = (gameKey: string, tag: string | null | undefined): string | null => iconUrl(ELEMENT_ICONS[gameKey], tag);

/** A weapon type's (path's, specialty's) icon in this game, or null where no source has it. */
export const weaponTypeIconUrl = (gameKey: string, type: string | null | undefined): string | null => iconUrl(WEAPON_TYPE_ICONS[gameKey], type);

/** The element's colour in this game, or null where it has none (the card keeps the paper look). */
export function elementColor(gameKey: string, tag: string | null | undefined): string | null {
  return (tag && BY_GAME[gameKey]?.[tag]) || null;
}
