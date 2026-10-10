import { getGame, hoyolabNotesUrl, readNotes, type HoyolabError } from "@gacha/shared";
import type { LinkedAccount } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { linkKeys, openSecret } from "./linkSecret.js";
import { hoyolabGet } from "./hoyolab.js";
import { isDoneThisCycle } from "./resets.js";
import { regionForInstance } from "../api/util.js";

/** Notes at most this often per account (ADR 0005). */
const EVERY_MS = 30 * 60_000;

/**
 * Reads the real-time notes of every profile the linked account plays (ADR
 * 0005): stamina and its reserve become the profile's currencies, and a done
 * daily ticks the game's daily task. A refusal marks the link for attention,
 * and it is not tried again until linked anew.
 */
export async function syncLink(link: LinkedAccount, now: Date): Promise<{ synced: string[] } | { error: HoyolabError }> {
  const cookie = openSecret(link.secret!, link.keyVersion!, `${link.userId}:hoyolab`, linkKeys());
  const profiles = await prisma.gameInstance.findMany({ where: { userId: link.userId, gameKey: { in: ["genshin", "hsr", "zzz"] }, uid: { not: null } } });
  const synced: string[] = [];
  let error: HoyolabError | undefined;
  for (const gi of profiles) {
    const game = getGame(gi.gameKey)!;
    const region = regionForInstance(game, gi);
    const url = hoyolabNotesUrl(gi.gameKey, gi.regionKey, gi.uid!);
    if (!url) continue;
    const notes = readNotes(gi.gameKey, await hoyolabGet(url, cookie).catch(() => null));
    if ("error" in notes) {
      error = notes.error;
      break;
    }
    for (const [key, value] of Object.entries(notes.currencies)) {
      await prisma.currencyState.upsert({ where: { gameInstanceId_key: { gameInstanceId: gi.id, key } }, create: { gameInstanceId: gi.id, key, value }, update: { value } });
    }
    // The game's first daily is the one the notes speak of (commissions, daily training, daily missions).
    const daily = game.defaultTasks.find((t) => t.cadence === "daily");
    if (notes.dailyDone && daily) {
      const task = await prisma.task.findFirst({ where: { userId: link.userId, scope: "game", refId: gi.id, title: daily.title } });
      if (task && !isDoneThisCycle(task.lastCompletedAt, now, region, { cadence: "daily" })) await prisma.task.update({ where: { id: task.id }, data: { lastCompletedAt: now } });
    }
    synced.push(gi.gameKey);
  }
  await prisma.linkedAccount.update({ where: { id: link.id }, data: error ? { status: "attention", lastError: error } : { lastSyncAt: now, lastError: null } });
  await prisma.importRun.create({ data: { userId: link.userId, provider: "hoyolab", kind: "notes", added: synced.length, error: error ?? null } });
  return error ? { error } : { synced };
}

/** The cron's part: links idle for 30 minutes, each claimed before it is synced so two ticks never share one. */
export async function syncDueLinks(now: Date, limit = 10): Promise<number> {
  try {
    linkKeys();
  } catch {
    return 0; // Linking is off until LINK_SECRET_KEY is set.
  }
  const cutoff = new Date(now.getTime() - EVERY_MS);
  const due = await prisma.linkedAccount.findMany({
    where: { provider: "hoyolab", status: "ok", secret: { not: null }, OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: cutoff } }] },
    take: limit,
  });
  let done = 0;
  for (const link of due) {
    const claimed = await prisma.linkedAccount.updateMany({ where: { id: link.id, OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: cutoff } }] }, data: { lastSyncAt: now } });
    if (!claimed.count) continue;
    await syncLink(link, now).catch(() => null);
    done += 1;
  }
  return done;
}
