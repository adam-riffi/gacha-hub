import { gameDashboardExtrasDto, getGame, type RegenProjectionDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import type { GameServerModule } from "./index.js";

/**
 * Project a regenerating resource forward from its last-saved snapshot.
 * Pure and unit-tested: given the stored value at `since`, returns the value
 * now (clamped to cap) and when it will be full.
 */
export function projectRegen(
  value: number,
  cap: number,
  regenPerHour: number,
  since: Date,
  now: Date,
): { value: number; full: boolean; fullAt: string | null } {
  const elapsedH = Math.max(0, (now.getTime() - since.getTime()) / 3_600_000);
  const projected = Math.min(cap, value + regenPerHour * elapsedH);
  const full = projected >= cap;
  const fullAt = full
    ? null
    : new Date(now.getTime() + ((cap - projected) / regenPerHour) * 3_600_000).toISOString();
  return { value: Math.floor(projected), full, fullAt };
}

/** The game's regenerating currency (resin), projected to now for a profile. */
async function resinProjection(instanceId: string): Promise<RegenProjectionDto | null> {
  const game = getGame("genshin");
  const currency = game?.currencies.find((c) => c.regenPerHour && c.cap);
  if (!currency) return null;

  const row = await prisma.currencyState.findUnique({
    where: { gameInstanceId_key: { gameInstanceId: instanceId, key: currency.key } },
  });
  const now = new Date();
  const p = projectRegen(row?.value ?? 0, currency.cap!, currency.regenPerHour!, row?.updatedAt ?? now, now);
  return {
    key: currency.key,
    label: currency.label,
    value: p.value,
    cap: currency.cap!,
    regenPerHour: currency.regenPerHour!,
    full: p.full,
    fullAt: p.fullAt,
  };
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
