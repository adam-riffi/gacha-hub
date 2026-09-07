import type { GameInstance, Prisma } from "@prisma/client";
import { getGame, type GameDefinition } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { toRegionReset, type RegionReset } from "../lib/resets.js";

/** Look up a hardcoded game module by key, or throw a 404. */
export function gameOrThrow(gameKey: string): GameDefinition {
  const game = getGame(gameKey);
  if (!game) {
    const err = new Error("unknown_game") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return game;
}

/**
 * Resolve reset timing for a profile. Falls back to the game's first region
 * when its regionKey isn't offered (single-region games, or a stale key).
 */
export function regionForInstance(
  game: GameDefinition,
  instance: Pick<GameInstance, "regionKey">,
): RegionReset {
  const region =
    game.regions.find((r) => r.key === instance.regionKey) ?? game.regions[0];
  return toRegionReset(region);
}

/** Validate a character document against its game's bespoke schema. */
export function validateDoc(game: GameDefinition, doc: unknown): unknown {
  return game.docSchema.parse(doc ?? game.emptyDoc());
}

export function loadInstance(userId: string, id: string) {
  return prisma.gameInstance.findFirst({ where: { id, userId } });
}

export function loadCharacter(userId: string, id: string) {
  return prisma.character.findFirst({
    where: { id, gameInstance: { userId } },
    include: { gameInstance: true },
  });
}

export type PrismaJson = Prisma.InputJsonValue;
