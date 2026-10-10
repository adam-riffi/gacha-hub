/**
 * Each element's colour across the games, for the character cards and the
 * unit page (Georges, 2026-10-10: "colored based on their elements"; the
 * design canvas tints a character to its element). Light enough for dark text
 * on it (contrast 4.5:1 and up); the same hue where games share an idea.
 */
const COLOR: Record<string, string> = {
  // Fire
  Pyro: "#ff8a6a",
  Fire: "#ff8a6a",
  Fusion: "#ff8a6a",
  Heat: "#ff8a6a",
  // Water and ice
  Hydro: "#6cc4ff",
  Cryo: "#9ee7f5",
  Ice: "#9ee7f5",
  Glacio: "#9ee7f5",
  // Lightning
  Electro: "#c59bff",
  Lightning: "#c59bff",
  Electric: "#c59bff",
  // Wind
  Anemo: "#7fe0c0",
  Wind: "#7fe0c0",
  Aero: "#7fe0c0",
  // The rest
  Geo: "#f2c55c",
  Dendro: "#a8d86a",
  Nature: "#a8d86a",
  Physical: "#d6d6d6",
  Quantum: "#a99cff",
  Imaginary: "#ffe27a",
  Havoc: "#f07bb0",
  Spectro: "#f3e3a0",
  Ether: "#ff8fd8",
  Lumiflux: "#ffd59a",
};

/** The element's colour, or null for none (the card keeps the paper look). */
export const elementColor = (tag: string | null | undefined) => (tag && COLOR[tag]) || null;
