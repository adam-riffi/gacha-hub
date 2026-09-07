import type { GameInstance } from "@prisma/client";
import type { CommandOptions } from "../discord/commands.js";

/**
 * Server-side counterpart of the client sheet registry: a game module can
 * contribute Discord slash commands and dashboard extras without touching the
 * generic host. Register a game by adding an entry below.
 */
export interface BotCommandDef {
  name: string;
  description: string;
  options?: { name: string; description: string; type: number; required?: boolean }[];
}

export interface GameServerModule {
  key: string;
  /** Extra slash commands this game contributes (registered with the core set). */
  botCommands?: BotCommandDef[];
  /** Handle one of this game's commands; return null to decline. */
  handleBotCommand?: (
    name: string,
    options: CommandOptions,
    ctx: { userId: string; instance: GameInstance | null },
  ) => Promise<string | null>;
  /** Bespoke data for the game's dashboard card. */
  dashboardExtras?: (instance: GameInstance) => Promise<unknown>;
}

export const gameServerModules: Record<string, GameServerModule> = {
  // genshin: genshinServer,
  // hsr: hsrServer,
};

export function getGameServerModule(key: string): GameServerModule | undefined {
  return gameServerModules[key];
}

export function allGameBotCommands(): BotCommandDef[] {
  return Object.values(gameServerModules).flatMap((m) => m.botCommands ?? []);
}
