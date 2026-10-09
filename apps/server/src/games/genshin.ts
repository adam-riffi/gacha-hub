import { gameDashboardExtrasDto, getGame, type RegenProjectionDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { projectRegen, staminaProjection } from "../lib/regen.js";

/** Kept here for the resin tests; the projection itself lives in lib/regen.ts. */
export { projectRegen };
import type { GameServerModule } from "./index.js";

/** The game's regenerating currency (resin), projected to now for a profile. */
async function resinProjection(instanceId: string): Promise<RegenProjectionDto | null> {
  const game = getGame("genshin");
  if (!game) return null;
  const rows = await prisma.currencyState.findMany({ where: { gameInstanceId: instanceId } });
  return staminaProjection(game, rows);
}

/** Server-side Genshin module: a /resin command and a resin dashboard widget. */
export const genshinServer: GameServerModule = {
  key: "genshin",
  botCommands: [{ name: "resin", description: "Show your projected Original Resin and time to cap" }],

  handleBotCommand: async (name, _options, { instance }) => {
    if (name !== "resin") return null;
    if (!instance) return "You haven't installed Genshin Impact yet.";
    const p = await resinProjection(instance.id);
    if (!p) return "No resin data for this profile.";
    if (p.full) return `⛲ **${p.label}**: ${p.value}/${p.cap} — full! Go spend it.`;
    const mins = Math.max(0, Math.round((new Date(p.fullAt!).getTime() - Date.now()) / 60_000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `⛲ **${p.label}**: ${p.value}/${p.cap} — full in ${h}h ${String(m).padStart(2, "0")}m`;
  },

  dashboardExtras: async (instance) => {
    const regen = await resinProjection(instance.id);
    return regen ? gameDashboardExtrasDto.parse({ regen }) : undefined;
  },
};
