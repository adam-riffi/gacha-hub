import type { GameInstance } from "@prisma/client";
import { getGame, type GameDefinition, type TaskCadence } from "@gacha/shared";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { isDoneThisCycle } from "../lib/resets.js";
import { farmableToday, gameWeekday } from "../lib/availability.js";
import { formatRemaining, listBanners, listEvents } from "../lib/timeline.js";
import { getCatalog, regionForInstance } from "../api/util.js";

/* Slash command definitions as plain Discord API JSON (no discord.js).
 * Option types: 3 = STRING, 5 = BOOLEAN, 10 = NUMBER. */
const STRING = 3;
const BOOLEAN = 5;
const NUMBER = 10;
const opt = (name: string, description: string, type: number, required = true) => ({
  name,
  description,
  type,
  required,
});

export const commands = [
  {
    name: "status",
    description: "Overview of your currencies and outstanding dailies",
    options: [opt("game", "Filter to one game", STRING, false)],
  },
  {
    name: "currency",
    description: "Show currencies for a game",
    options: [opt("game", "Game name", STRING)],
  },
  {
    name: "update",
    description: "Set a currency value",
    options: [
      opt("game", "Game name", STRING),
      opt("currency", "Currency name/key", STRING),
      opt("value", "New value", NUMBER),
    ],
  },
  {
    name: "done",
    description: "Mark a recurring task complete for this cycle",
    options: [opt("game", "Game name", STRING), opt("task", "Task title", STRING)],
  },
  {
    name: "goal",
    description: "Update a farming goal's progress",
    options: [opt("task", "Goal title", STRING), opt("progress", "Current progress", NUMBER)],
  },
  {
    name: "build",
    description: "Show a character's build summary",
    options: [opt("game", "Game name", STRING), opt("character", "Character name", STRING)],
  },
  {
    name: "banner",
    description: "Current and upcoming banners for your games",
    options: [opt("game", "Filter to one game", STRING, false)],
  },
  {
    name: "events",
    description: "Current and upcoming events for your games",
    options: [opt("game", "Filter to one game", STRING, false)],
  },
  {
    name: "farm",
    description: "Materials you still need that are farmable today",
    options: [opt("game", "Filter to one game", STRING, false)],
  },
  {
    name: "own",
    description: "Mark a character as owned (or not)",
    options: [
      opt("game", "Game name", STRING),
      opt("character", "Character name", STRING),
      opt("owned", "Owned? (default: yes)", BOOLEAN, false),
    ],
  },
];

/** Normalized options from an interaction payload. */
export type CommandOptions = Record<string, string | number | boolean | undefined>;

type InstanceWithData = GameInstance & { currencies: { key: string; value: number }[] };

async function allInstances(userId: string): Promise<InstanceWithData[]> {
  return prisma.gameInstance.findMany({
    where: { userId },
    include: { currencies: true },
    orderBy: { createdAt: "asc" },
  });
}

function resolveInstance(instances: InstanceWithData[], name: string) {
  const lower = name.toLowerCase();
  for (const gi of instances) {
    const game = getGame(gi.gameKey);
    if (game && (game.name.toLowerCase().includes(lower) || game.key === lower)) {
      return { gi, game };
    }
  }
  return null;
}

function fmtCurrencies(game: GameDefinition, currencies: { key: string; value: number }[]) {
  const byKey = new Map(game.currencies.map((c) => [c.key, c]));
  if (currencies.length === 0) return "_none_";
  return currencies
    .map((c) => {
      const d = byKey.get(c.key);
      const label = d?.label ?? c.key;
      return d?.cap ? `${label}: ${c.value}/${d.cap}` : `${label}: ${c.value}`;
    })
    .join(" · ");
}

async function undoneDailies(userId: string, gi: GameInstance, game: GameDefinition) {
  const tasks = await prisma.task.findMany({
    where: { userId, scope: "game", refId: gi.id, type: "recurring" },
  });
  const region = regionForInstance(game, gi);
  const now = new Date();
  return tasks
    .filter(
      (t) => !isDoneThisCycle(t.lastCompletedAt, now, region, (t.cadence as TaskCadence) ?? "daily"),
    )
    .map((t) => t.title);
}

const LINK_HINT = `You have no linked account yet. Sign in with Discord at ${config.appBaseUrl} first.`;
const str = (o: CommandOptions, k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
const num = (o: CommandOptions, k: string) => (typeof o[k] === "number" ? (o[k] as number) : Number.NaN);

/**
 * Transport-agnostic command dispatcher: takes the command name, normalized
 * options, and the invoking Discord user id; returns the reply text.
 */
export async function handleCommand(
  name: string,
  options: CommandOptions,
  discordUserId: string,
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { discordId: discordUserId } });
  if (!user) return LINK_HINT;

  switch (name) {
    case "status":
      return handleStatus(options, user.id);
    case "currency":
      return handleCurrency(options, user.id);
    case "update":
      return handleUpdate(options, user.id);
    case "done":
      return handleDone(options, user.id);
    case "goal":
      return handleGoal(options, user.id);
    case "build":
      return handleBuild(options, user.id);
    case "banner":
      return handleTimeline(options, user.id, "banners");
    case "events":
      return handleTimeline(options, user.id, "events");
    case "farm":
      return handleFarm(options, user.id);
    case "own":
      return handleOwn(options, user.id);
    default: {
      // Per-game modules may contribute their own commands.
      const { gameServerModules } = await import("../games/index.js");
      for (const mod of Object.values(gameServerModules)) {
        if (!mod.handleBotCommand || !mod.botCommands?.some((c) => c.name === name)) continue;
        const instance = await prisma.gameInstance.findUnique({
          where: { userId_gameKey: { userId: user.id, gameKey: mod.key } },
        });
        const reply = await mod.handleBotCommand(name, options, { userId: user.id, instance });
        if (reply !== null) return reply;
      }
      return "Unknown command.";
    }
  }
}

async function handleStatus(o: CommandOptions, userId: string) {
  const filter = str(o, "game");
  const lines: string[] = [];
  for (const gi of await allInstances(userId)) {
    const game = getGame(gi.gameKey);
    if (!game) continue;
    if (filter && !game.name.toLowerCase().includes(filter.toLowerCase())) continue;
    const left = await undoneDailies(userId, gi, game);
    lines.push(`__**${game.name}**__ — ${fmtCurrencies(game, gi.currencies)}`);
    lines.push(left.length ? `   dailies left: ${left.join(", ")}` : "   ✅ dailies done");
  }
  return lines.length ? lines.join("\n").slice(0, 1900) : "No games found.";
}

async function handleCurrency(o: CommandOptions, userId: string) {
  const name = str(o, "game");
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) return `No game matching "${name}".`;
  return `**${found.game.name}** — ${fmtCurrencies(found.game, found.gi.currencies)}`.slice(0, 1900);
}

async function handleUpdate(o: CommandOptions, userId: string) {
  const name = str(o, "game");
  const currencyName = str(o, "currency");
  const value = num(o, "value");
  if (Number.isNaN(value) || value < 0) return "Value must be a non-negative number.";
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) return `No game matching "${name}".`;
  const lower = currencyName.toLowerCase();
  const cur = found.game.currencies.find(
    (c) => c.key.toLowerCase() === lower || c.label.toLowerCase() === lower,
  );
  if (!cur) return `No currency "${currencyName}" in ${found.game.name}.`;
  await prisma.currencyState.upsert({
    where: { gameInstanceId_key: { gameInstanceId: found.gi.id, key: cur.key } },
    create: { gameInstanceId: found.gi.id, key: cur.key, value },
    update: { value },
  });
  return `✅ ${found.game.name}: **${cur.label}** = ${value}`;
}

async function handleDone(o: CommandOptions, userId: string) {
  const name = str(o, "game");
  const taskName = str(o, "task");
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) return `No game matching "${name}".`;
  const tasks = await prisma.task.findMany({
    where: { userId, scope: "game", refId: found.gi.id, type: "recurring" },
  });
  const lower = taskName.toLowerCase();
  const task = tasks.find((t) => t.title.toLowerCase().includes(lower));
  if (!task) return `No task matching "${taskName}".`;
  await prisma.task.update({ where: { id: task.id }, data: { lastCompletedAt: new Date() } });
  return `✅ Marked done: **${task.title}**`;
}

async function handleGoal(o: CommandOptions, userId: string) {
  const taskName = str(o, "task");
  const progress = num(o, "progress");
  if (Number.isNaN(progress) || progress < 0) return "Progress must be a non-negative number.";
  const tasks = await prisma.task.findMany({ where: { userId, type: "goal" } });
  const lower = taskName.toLowerCase();
  const task = tasks.find((t) => t.title.toLowerCase().includes(lower));
  if (!task) return `No goal matching "${taskName}".`;
  await prisma.task.update({ where: { id: task.id }, data: { progress } });
  const target = task.target ? `/${task.target}` : "";
  return `🎯 **${task.title}**: ${progress}${target}`;
}

/** Generic summary that works for any game's bespoke character doc. */
function summarizeDoc(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "_empty_";
  const lines: string[] = [];
  for (const [k, v] of Object.entries(doc as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object") {
      const count = Array.isArray(v) ? v.length : Object.keys(v).length;
      if (count > 0) lines.push(`${k}: ${count}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  return lines.join(" · ") || "_empty_";
}

async function handleBuild(o: CommandOptions, userId: string) {
  const name = str(o, "game");
  const charName = str(o, "character");
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) return `No game matching "${name}".`;
  const candidates = await prisma.character.findMany({ where: { gameInstanceId: found.gi.id } });
  const lc = charName.toLowerCase();
  const character = candidates.find((c) => c.name.toLowerCase().includes(lc)) ?? null;
  if (!character) return `No character matching "${charName}".`;
  return `**${character.name}** — ${found.game.name}\n${summarizeDoc(character.doc)}`.slice(0, 1900);
}

/** The user's installed games, optionally narrowed by a name filter. */
async function gamesFor(userId: string, filter: string) {
  const out: { gi: InstanceWithData; game: GameDefinition }[] = [];
  for (const gi of await allInstances(userId)) {
    const game = getGame(gi.gameKey);
    if (!game) continue;
    if (filter && !game.name.toLowerCase().includes(filter.toLowerCase()) && game.key !== filter.toLowerCase()) continue;
    out.push({ gi, game });
  }
  return out;
}

const STATUS_ICON = { active: "🟢", upcoming: "🕒", ended: "⚫" } as const;

async function handleTimeline(o: CommandOptions, userId: string, kind: "banners" | "events") {
  const games = await gamesFor(userId, str(o, "game"));
  if (games.length === 0) return "No games found.";
  const now = new Date();
  const lines: string[] = [];
  for (const { game } of games) {
    const items = kind === "banners" ? await listBanners([game.key], "current", now) : await listEvents([game.key], "current", now);
    if (items.length === 0) continue;
    lines.push(`__**${game.name}**__`);
    const cat = kind === "banners" ? await getCatalog(game) : null;
    for (const it of items) {
      const when = it.status === "upcoming" ? `starts in ${formatRemaining(it.startsAt, now)}` : `ends in ${formatRemaining(it.endsAt, now)}`;
      let line = `${STATUS_ICON[it.status]} **${it.name}** — ${when}`;
      if ("featured" in it && it.featured.length) {
        const names = it.featured.map((f) =>
          (f.kind === "character" ? cat?.index.characters.get(f.catalogId)?.name : cat?.index.weapons.get(f.catalogId)?.name) ?? f.catalogId,
        );
        line += `\n   featured: ${names.join(", ")}`;
      }
      lines.push(line);
    }
  }
  return lines.length ? lines.join("\n").slice(0, 1900) : `No current or upcoming ${kind}.`;
}

/** Rotating materials you're short on that are farmable today (per region). */
async function handleFarm(o: CommandOptions, userId: string) {
  const games = await gamesFor(userId, str(o, "game"));
  if (games.length === 0) return "No games found.";
  const lines: string[] = [];
  for (const { gi, game } of games) {
    const cat = await getCatalog(game);
    if (!cat) continue;
    const [tasks, stock] = await Promise.all([
      prisma.task.findMany({ where: { userId, scope: "game", refId: gi.id, type: "goal", materialId: { not: null } } }),
      prisma.materialStock.findMany({ where: { gameInstanceId: gi.id } }),
    ]);
    const have = new Map(stock.map((s) => [s.materialId, s.qty]));
    const need = new Map<string, number>();
    for (const t of tasks) need.set(t.materialId!, (need.get(t.materialId!) ?? 0) + Math.max(0, t.target ?? 0));
    const weekday = gameWeekday(regionForInstance(game, gi));
    const today: string[] = [];
    let missingRotating = 0;
    for (const [id, n] of need) {
      const missing = n - (have.get(id) ?? 0);
      const m = cat.index.materials.get(id);
      if (missing <= 0 || !m?.availability?.length) continue;
      missingRotating += 1;
      if (farmableToday(m.availability, weekday)) today.push(`${m.name} ×${missing}`);
    }
    if (today.length) lines.push(`__**${game.name}**__ today: ${today.join(", ")}`);
    else if (missingRotating) lines.push(`__**${game.name}**__: nothing you're short on rotates in today`);
  }
  return lines.length ? lines.join("\n").slice(0, 1900) : "No rotating materials needed — plan something from a character screen first.";
}

async function handleOwn(o: CommandOptions, userId: string) {
  const name = str(o, "game");
  const charName = str(o, "character");
  const owned = typeof o.owned === "boolean" ? o.owned : true;
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) return `No game matching "${name}".`;
  const cat = await getCatalog(found.game);
  if (!cat) return `${found.game.name} has no character catalog yet.`;
  const lc = charName.toLowerCase();
  const entry =
    cat.catalog.characters.find((c) => c.name.toLowerCase() === lc) ??
    cat.catalog.characters.find((c) => c.name.toLowerCase().includes(lc));
  if (!entry) return `No character matching "${charName}" in ${found.game.name}.`;
  const where = { gameInstanceId_kind_catalogId: { gameInstanceId: found.gi.id, kind: "character", catalogId: entry.id } };
  if (owned) {
    await prisma.ownership.upsert({ where, create: { gameInstanceId: found.gi.id, kind: "character", catalogId: entry.id }, update: {} });
    return `✅ ${found.game.name}: you now own **${entry.name}**.`;
  }
  await prisma.ownership.deleteMany({ where: { gameInstanceId: found.gi.id, kind: "character", catalogId: entry.id } });
  return `➖ ${found.game.name}: **${entry.name}** marked as not owned.`;
}
