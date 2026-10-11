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
};

/** The element's colour in this game, or null where it has none (the card keeps the paper look). */
export function elementColor(gameKey: string, tag: string | null | undefined): string | null {
  return (tag && BY_GAME[gameKey]?.[tag]) || null;
}
