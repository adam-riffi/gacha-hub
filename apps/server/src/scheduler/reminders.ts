import type { CurrencyState, GameInstance } from "../generated/prisma/client.js";
import {
  domainsToday,
  gameWeekday,
  getGame,
  reminderConfigSchema,
  type GameDefinition,
  type OpenDomain,
  endgameNow,
  premiumCurrency,
  taskAnchor,
  type ReminderConfig,
  type TaskCadence,
} from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { isDoneThisCycle } from "../lib/resets.js";
import { dueReminders, type DueExtra } from "./due.js";
import type { RegionReset } from "../lib/resets.js";
import { getCatalog, regionForInstance } from "../api/util.js";
import { sendDirectMessage } from "../discord/rest.js";

function fmtCurrencies(
  game: GameDefinition,
  currencies: { key: string; value: number }[],
): string {
  const byKey = new Map(game.currencies.map((c) => [c.key, c]));
  if (currencies.length === 0) return "";
  return currencies
    .map((c) => {
      const d = byKey.get(c.key);
      const label = d?.label ?? c.key;
      return d?.cap ? `${label} ${c.value}/${d.cap}` : `${label} ${c.value}`;
    })
    .join(" · ");
}

const MAX_DOMAINS = 4;
const MAX_UNITS = 3;
const more = (n: number, label = "") => (n > 0 ? ` +${n}${label}` : "");

/** One DM line for today's domains, or null when none is open for you. */
export function fmtDomains(domains: OpenDomain[]): string | null {
  if (domains.length === 0) return null;
  const parts = domains.slice(0, MAX_DOMAINS).map((d) => {
    const names = d.units.slice(0, MAX_UNITS).map((u) => u.name).join(", ");
    return `${d.source.replace(/^Domain of \w+: /, "")} (${names}${more(d.units.length - MAX_UNITS)})`;
  });
  return `🗺️ Domains today: ${parts.join(", ")}${more(domains.length - MAX_DOMAINS, " more")}`;
}

async function openDomains(instance: GameInstance, game: GameDefinition, now: Date): Promise<OpenDomain[]> {
  const cat = await getCatalog(game);
  if (!cat) return [];
  const [owned, builds] = await Promise.all([
    prisma.ownership.findMany({ where: { gameInstanceId: instance.id }, select: { kind: true, catalogId: true } }),
    prisma.character.findMany({ where: { gameInstanceId: instance.id, catalogId: { not: null } }, select: { catalogId: true } }),
  ]);
  const builtIds = new Set(builds.map((b) => b.catalogId!));
  return domainsToday(cat.catalog, owned, builtIds, gameWeekday(regionForInstance(game, instance), now));
}

async function undoneDailies(userId: string, instance: GameInstance, game: GameDefinition) {
  const tasks = await prisma.task.findMany({
    where: { userId, scope: "game", refId: instance.id, type: "recurring" },
  });
  const region = regionForInstance(game, instance);
  const now = new Date();
  return tasks
    .filter(
      (t) =>
        !isDoneThisCycle(t.lastCompletedAt, now, region, taskAnchor(game.manifest, (t.cadence as TaskCadence) ?? "daily", t.anchorKey)),
    )
    .map((t) => t.title);
}

/**
 * What the stamina and endgame reminders need: when the stamina fills, from
 * its stored value (a fixed instant, so it dedupes), and each open endgame
 * mode's reset with the premium still unclaimed.
 */
async function dueExtra(cfg: ReminderConfig, game: GameDefinition, instance: GameInstance & { currencies: CurrencyState[] }, region: RegionReset, now: Date): Promise<DueExtra> {
  const extra: DueExtra = {};
  const def = game.currencies.find((c) => c.key === game.manifest.stamina.currency);
  const row = instance.currencies.find((c) => c.key === def?.key);
  if (cfg.whenStaminaFull && def?.cap && def.regenPerHour) {
    const from = row ?? { value: 0, updatedAt: instance.createdAt };
    const hours = Math.max(0, def.cap - from.value) / def.regenPerHour;
    extra.stamina = { label: def.label, fullAt: new Date(from.updatedAt.getTime() + hours * 3_600_000) };
  }
  if (cfg.beforeEndgameReset && game.manifest.endgame.length) {
    const rows = await prisma.cycleResult.findMany({ where: { gameInstanceId: instance.id } });
    const premium = premiumCurrency(game);
    extra.endgame = endgameNow(game, region, now, rows)
      .modes.filter((m) => m.open && m.mode.maxPremium !== undefined)
      .map((m) => ({ key: m.mode.key, name: m.mode.name, closes: m.closes, unclaimed: m.mode.maxPremium! - m.premium, premium }));
  }
  return extra;
}

/**
 * Evaluate all enabled reminder rules; send + log any that are due. Safe to
 * call from a coarse external cron: the (rule, boundary) log makes it
 * idempotent.
 */
export async function runReminderTick(now = new Date()): Promise<void> {
  const rules = await prisma.reminderRule.findMany({
    // Sleeping games get no reminders.
    where: { enabled: true, gameInstanceId: { not: null }, gameInstance: { is: { sleeping: false } } },
    include: { user: true },
  });

  for (const rule of rules) {
    try {
      const instance = await prisma.gameInstance.findUnique({
        where: { id: rule.gameInstanceId! },
        include: { currencies: true },
      });
      if (!instance) continue;
      const game = getGame(instance.gameKey);
      if (!game) continue;

      const cfg = reminderConfigSchema.parse(rule.config ?? {});
      if (!cfg.enabled) continue;

      const region = regionForInstance(game, instance);
      const pending = [];
      for (const d of dueReminders(cfg, region, game.name, now, await dueExtra(cfg, game, instance, region, now))) {
        const already = await prisma.reminderLog.findUnique({
          where: { ruleId_firedFor_key: { ruleId: rule.id, firedFor: d.firedFor, key: d.key } },
        });
        if (!already) pending.push(d);
      }
      if (pending.length === 0) continue;

      const parts: string[] = [];
      if (cfg.includeCurrencies) {
        const cur = fmtCurrencies(game, instance.currencies);
        if (cur) parts.push(cur);
      }
      if (cfg.includeDailies) {
        const left = await undoneDailies(rule.userId, instance, game);
        parts.push(left.length ? `Dailies left: ${left.join(", ")}` : "✅ dailies done");
      }

      if (cfg.includeDomains) {
        const line = fmtDomains(await openDomains(instance, game, now));
        if (line) parts.push(line);
      }

      // Tasks the user flagged with the notify toggle ride along in the DM.
      const flagged = await prisma.task.findMany({
        where: { userId: rule.userId, scope: "game", refId: instance.id, notify: true, backlog: false, parentId: null },
        select: { title: true },
      });
      if (flagged.length) {
        parts.push(`🔔 Flagged: ${flagged.map((t) => t.title).join(", ")}`.slice(0, 400));
      }

      // Usually one; if a late tick finds several due (e.g. a check-in right
      // before reset), each gets its own DM and log row.
      for (const d of pending) {
        await sendDirectMessage(rule.user.discordId, [d.headline, ...parts].join("\n"));
        await prisma.reminderLog.create({ data: { ruleId: rule.id, firedFor: d.firedFor, key: d.key } });
      }
    } catch (err) {
      console.error(`[scheduler] rule ${rule.id} failed:`, err);
    }
  }
}
