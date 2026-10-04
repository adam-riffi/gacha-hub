import type { GameInstance } from "@prisma/client";
import {
  getGame,
  reminderConfigSchema,
  type GameDefinition,
  type TaskCadence,
} from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { isDoneThisCycle } from "../lib/resets.js";
import { dueReminders } from "./due.js";
import { regionForInstance } from "../api/util.js";
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

async function undoneDailies(userId: string, instance: GameInstance, game: GameDefinition) {
  const tasks = await prisma.task.findMany({
    where: { userId, scope: "game", refId: instance.id, type: "recurring" },
  });
  const region = regionForInstance(game, instance);
  const now = new Date();
  return tasks
    .filter(
      (t) =>
        !isDoneThisCycle(t.lastCompletedAt, now, region, (t.cadence as TaskCadence) ?? "daily"),
    )
    .map((t) => t.title);
}

/**
 * Evaluate all enabled reminder rules; send + log any that are due. Safe to
 * call from a coarse external cron: the (rule, boundary) log makes it
 * idempotent.
 */
export async function runReminderTick(now = new Date()): Promise<void> {
  const rules = await prisma.reminderRule.findMany({
    where: { enabled: true, gameInstanceId: { not: null } },
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
      for (const d of dueReminders(cfg, region, game.name, now)) {
        const already = await prisma.reminderLog.findUnique({
          where: { ruleId_firedFor: { ruleId: rule.id, firedFor: d.firedFor } },
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
        await prisma.reminderLog.create({ data: { ruleId: rule.id, firedFor: d.firedFor } });
      }
    } catch (err) {
      console.error(`[scheduler] rule ${rule.id} failed:`, err);
    }
  }
}
