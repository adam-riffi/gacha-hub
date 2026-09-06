import type { GameDefinition } from "./types.js";
import { genshin } from "./genshin.js";
import { hsr } from "./hsr.js";
import { zzz } from "./zzz.js";
import { endfield } from "./endfield.js";

/** The registry of hardcoded games. Add a game by writing its module + sheet. */
export const games: Record<string, GameDefinition> = {
  [genshin.key]: genshin,
  [hsr.key]: hsr,
  [zzz.key]: zzz,
  [endfield.key]: endfield,
};

export const gameList: GameDefinition[] = Object.values(games);

export function getGame(key: string): GameDefinition | undefined {
  return games[key];
}

export function isGameKey(key: string): boolean {
  return key in games;
}

export * from "./types.js";
export * from "./regions.js";
export * from "./genshin.js";
export * from "./hsr.js";
export * from "./zzz.js";
export * from "./endfield.js";
