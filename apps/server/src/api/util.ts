import type { Account, Prisma } from "@prisma/client";
import { getGame, type GameDefinition } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { toRegionReset, type RegionReset } from "../lib/resets.js";

/** Look up a hardcoded game module by key, or throw a 404-ish error. */
export function gameOrThrow(gameKey: string): GameDefinition {
  const game = getGame(gameKey);
  if (!game) {
    const err = new Error("unknown_game") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return game;
}

/** Resolve reset timing for an account from its game + regionKey. */
export function regionForAccount(
  game: GameDefinition,
  account: Pick<Account, "regionKey">,
): RegionReset {
  const region = account.regionKey
    ? game.regions.find((r) => r.key === account.regionKey)
    : game.regions[0];
  return toRegionReset(region ?? game.regions[0]);
}

/** Validate a character document against its game's bespoke schema. */
export function validateDoc(game: GameDefinition, doc: unknown): unknown {
  return game.docSchema.parse(doc ?? game.emptyDoc());
}

export function loadInstance(userId: string, id: string) {
  return prisma.gameInstance.findFirst({ where: { id, userId } });
}

export function loadAccount(userId: string, id: string) {
  return prisma.account.findFirst({
    where: { id, gameInstance: { userId } },
    include: { gameInstance: true },
  });
}

export function loadCharacter(userId: string, id: string) {
  return prisma.character.findFirst({
    where: { id, account: { gameInstance: { userId } } },
    include: { account: { include: { gameInstance: true } } },
  });
}

export type PrismaJson = Prisma.InputJsonValue;
