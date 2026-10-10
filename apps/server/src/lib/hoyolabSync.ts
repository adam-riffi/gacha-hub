import { HOYOLAB_CARDS_URL, cadenceWindow, chronicleRequests, getGame, hoyolabNotesUrl, mergeSynced, readChronicle, readNotes, readRecordCards, readRoster, rosterRequest, type HoyolabError } from "@gacha/shared";
import type { LinkedAccount } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { linkKeys, openSecret } from "./linkSecret.js";
import { hoyolabGet } from "./hoyolab.js";
import { isDoneThisCycle } from "./resets.js";
import { getCatalog, regionForInstance, validateDoc } from "../api/util.js";

/** Notes at most this often per account (ADR 0005). */
const EVERY_MS = 30 * 60_000;
/** The battle chronicle this often from the cron: each cycle's last result is at most this old when it resets. */
const CHRONICLE_EVERY_MS = 6 * 3_600_000;

/**
 * Reads the real-time notes of every profile the linked account plays (ADR
 * 0005): stamina and its reserve become the profile's currencies, and a done
 * daily ticks the game's daily task. A refusal marks the link for attention,
 * and it is not tried again until linked anew.
 */
export async function syncLink(link: LinkedAccount, now: Date, opts: { chronicle?: boolean } = {}): Promise<{ synced: string[]; chronicle?: number; roster?: number } | { error: HoyolabError }> {
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
  if (error) return { error };
  if (!opts.chronicle) return { synced };
  await syncProgress(link, cookie, profiles);
  return { synced, chronicle: await syncChronicle(link.userId, cookie, profiles, now), roster: await syncRoster(cookie, profiles) };
}

/** The record card's stats again, as each profile's long-term progress (G8); a card that fails changes nothing. */
async function syncProgress(link: LinkedAccount, cookie: string, profiles: { id: string; gameKey: string }[]): Promise<void> {
  const cards = readRecordCards(await hoyolabGet(`${HOYOLAB_CARDS_URL}?uid=${link.accountId}`, cookie).catch(() => null));
  for (const g of cards.games) {
    const gi = profiles.find((p) => p.gameKey === g.gameKey);
    if (gi && g.stats) await prisma.gameInstance.update({ where: { id: gi.id }, data: { progress: g.stats } });
  }
}

/**
 * The chronicle's roster (ADR 0005): every listed character and the weapon it
 * holds are owned, and an existing build takes the roster's level, dupes and
 * weapon where its field is empty or still as the last sync wrote it; what
 * the user typed stays. No build is created here: the showcase does that.
 */
async function syncRoster(cookie: string, profiles: { id: string; gameKey: string; regionKey: string; uid: string | null }[]): Promise<number> {
  let read = 0;
  for (const gi of profiles) {
    const req = rosterRequest(gi.gameKey, gi.regionKey, gi.uid!);
    const game = getGame(gi.gameKey)!;
    const cat = await getCatalog(game);
    if (!req || !cat) continue;
    const { units } = readRoster(game, await hoyolabGet(req.url, cookie, undefined, req.body).catch(() => null));
    const holder = game.manifest.dupes.weapon?.field.split(".")[0];
    for (const u of units) {
      if (!cat.index.characters.has(u.catalogId)) continue;
      read += 1;
      const own = (kind: string, catalogId: string) =>
        prisma.ownership.upsert({ where: { gameInstanceId_kind_catalogId: { gameInstanceId: gi.id, kind, catalogId } }, create: { gameInstanceId: gi.id, kind, catalogId, qty: 1 }, update: {} });
      await own("character", u.catalogId);
      const weapon = u.weaponId ? cat.index.weapons.get(u.weaponId) : undefined;
      if (weapon) await own("weapon", weapon.id);
      if (weapon && holder) (u.doc[holder] as Record<string, unknown>).name = weapon.name;
      const build = await prisma.character.findFirst({ where: { gameInstanceId: gi.id, catalogId: u.catalogId }, orderBy: { createdAt: "asc" } });
      if (!build) continue;
      const synced = build.synced as Record<string, unknown> | null;
      try {
        const doc = validateDoc(game, mergeSynced(build.doc as Record<string, unknown>, synced, u.doc));
        await prisma.character.update({ where: { id: build.id }, data: { doc: doc as object, synced: mergeSynced(synced ?? {}, synced, u.doc) as object } });
      } catch {
        // ponytail: a roster value outside the sheet's limits leaves that build as it was.
      }
    }
  }
  return read;
}

/**
 * The battle chronicle's current cycles as results (ADR 0005): a mode's record
 * lands in its cycle as a synced result; a result typed by hand stays. A
 * refusal here (a chronicle not public) is recorded but does not stop the link.
 */
async function syncChronicle(userId: string, cookie: string, profiles: { id: string; gameKey: string; regionKey: string; uid: string | null }[], now: Date): Promise<number> {
  let written = 0;
  let error: HoyolabError | null = null;
  for (const gi of profiles) {
    const game = getGame(gi.gameKey)!;
    const region = regionForInstance(game, gi);
    for (const req of chronicleRequests(gi.gameKey, gi.regionKey, gi.uid!)) {
      const mode = game.manifest.endgame.find((m) => m.key === req.modeKey);
      if (!mode) continue;
      const read = readChronicle(req.modeKey, await hoyolabGet(req.url, cookie).catch(() => null), now);
      if (!read) continue;
      if ("error" in read) {
        error ??= read.error;
        continue;
      }
      const cycleStart = cadenceWindow(mode.anchor, region, now).start;
      const key = { gameInstanceId_modeKey_cycleStart: { gameInstanceId: gi.id, modeKey: mode.key, cycleStart } };
      const typed = await prisma.cycleResult.findUnique({ where: key });
      if (typed && typed.source !== "hoyolab" && typed.result !== null) continue;
      const data = { result: Math.min(read.result, mode.metric.max ?? read.result), detail: read.detail ?? null, source: "hoyolab" };
      await prisma.cycleResult.upsert({ where: key, create: { gameInstanceId: gi.id, modeKey: mode.key, cycleStart, ...data }, update: data });
      written += 1;
    }
  }
  await prisma.importRun.create({ data: { userId, provider: "hoyolab", kind: "chronicle", added: written, error } });
  return written;
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
    const lastChronicle = await prisma.importRun.findFirst({ where: { userId: link.userId, provider: "hoyolab", kind: "chronicle" }, orderBy: { createdAt: "desc" } });
    const chronicle = !lastChronicle || now.getTime() - lastChronicle.createdAt.getTime() >= CHRONICLE_EVERY_MS;
    await syncLink(link, now, { chronicle }).catch(() => null);
    done += 1;
  }
  return done;
}
