import type { Account } from "@prisma/client";
import {
  getGame,
  reminderConfigSchema,
  type GameDefinition,
  type TaskCadence,
} from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { isDoneThisCycle, nextDailyReset } from "../lib/resets.js";
import { regionForAccount } from "../api/util.js";
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

async function undoneDailies(userId: string, account: Account, game: GameDefinition) {
  const tasks = await prisma.task.findMany({
    where: { userId, scope: "account", refId: account.id, type: "recurring" },
  });
  const region = regionForAccount(game, account);
  const now = new Date();
  return tasks
    .filter(
      (t) =>
        !isDoneThisCycle(
          t.lastCompletedAt,
          now,
          region,
          (t.cadence as TaskCadence) ?? "daily",
        ),
    )
    .map((t) => t.title);
}

/** Evaluate all enabled reminder rules; send + log any that are due. */
export async function runReminderTick(now = new Date()): Promise<void> {
  const rules = await prisma.reminderRule.findMany({
    where: { enabled: true, accountId: { not: null } },
    include: { user: true },
  });

  for (const rule of rules) {
    try {
      const account = await prisma.account.findUnique({
        where: { id: rule.accountId! },
        include: { gameInstance: true, currencies: true },
      });
      if (!account) continue;
      const game = getGame(account.gameInstance.gameKey);
      if (!game) continue;

      const cfg = reminderConfigSchema.parse(rule.config ?? {});
      if (!cfg.enabled) continue;

      const region = regionForAccount(game, account);
      const boundary = nextDailyReset(now, region);
      const fireAt = new Date(boundary.getTime() - cfg.leadMinutes * 60_000);
      if (now < fireAt || now >= boundary) continue;

      const already = await prisma.reminderLog.findUnique({
        where: { ruleId_firedFor: { ruleId: rule.id, firedFor: boundary } },
      });
      if (already) continue;

      const mins = Math.max(0, Math.round((boundary.getTime() - now.getTime()) / 60_000));
      const parts: string[] = [
        `⏰ **${game.name} — ${account.label}** resets in ${mins}m`,
      ];
      if (cfg.includeCurrencies) {
        const cur = fmtCurrencies(game, account.currencies);
        if (cur) parts.push(cur);
      }
      if (cfg.includeDailies) {
        const left = await undoneDailies(rule.userId, account, game);
        parts.push(left.length ? `Dailies left: ${left.join(", ")}` : "✅ dailies done");
      }

      await sendDirectMessage(rule.user.discordId, parts.join("\n"));
      await prisma.reminderLog.create({
        data: { ruleId: rule.id, firedFor: boundary },
      });
    } catch (err) {
      console.error(`[scheduler] rule ${rule.id} failed:`, err);
    }
  }
}
