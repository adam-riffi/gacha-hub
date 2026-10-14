import type { GameInstance } from "../generated/prisma/client.js";
import { getGame, taskAnchor, type GameDefinition, type TaskCadence } from "@gacha/shared";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { isDoneThisCycle } from "../lib/resets.js";
import { recordDays } from "../lib/dayRecord.js";
import { farmableToday, gameWeekday } from "@gacha/shared";
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
  for (const gameInstance of instances) {
    const game = getGame(gameInstance.gameKey);
    if (game && (game.name.toLowerCase().includes(lower) || game.key === lower)) {
      return { gi: gameInstance, game };
    }
  }
  return null;
}

function fmtCurrencies(game: GameDefinition, currencies: { key: string; value: number }[]) {
  const byKey = new Map(game.currencies.map((currency) => [currency.key, currency]));
  if (currencies.length === 0) return "_none_";
  return currencies
    .map((currencyState) => {
      const definition = byKey.get(currencyState.key);
      const label = definition?.label ?? currencyState.key;
      return definition?.cap ? `${label}: ${currencyState.value}/${definition.cap}` : `${label}: ${currencyState.value}`;
    })
    .join(" · ");
}

async function undoneDailies(userId: string, gameInstance: GameInstance, game: GameDefinition) {
  const tasks = await prisma.task.findMany({
    where: { userId, scope: "game", refId: gameInstance.id, type: "recurring" },
  });
  const region = regionForInstance(game, gameInstance);
  const now = new Date();
  return tasks
    .filter(
      (task) => !isDoneThisCycle(task.lastCompletedAt, now, region, taskAnchor(game.manifest, (task.cadence as TaskCadence) ?? "daily", task.anchorKey)),
    )
    .map((task) => task.title);
}

const LINK_HINT = `You have no linked account yet. Sign in with Discord at ${config.appBaseUrl} first.`;
const stringOption = (options: CommandOptions, key: string) => (typeof options[key] === "string" ? (options[key] as string) : "");
const numberOption = (options: CommandOptions, key: string) => (typeof options[key] === "number" ? (options[key] as number) : Number.NaN);

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
      for (const gameModule of Object.values(gameServerModules)) {
        if (!gameModule.handleBotCommand || !gameModule.botCommands?.some((botCommand) => botCommand.name === name)) continue;
        const instance = await prisma.gameInstance.findUnique({
          where: { userId_gameKey: { userId: user.id, gameKey: gameModule.key } },
        });
        const reply = await gameModule.handleBotCommand(name, options, { userId: user.id, instance });
        if (reply !== null) return reply;
      }
      return "Unknown command.";
    }
  }
}

async function handleStatus(options: CommandOptions, userId: string) {
  const filter = stringOption(options, "game");
  const lines: string[] = [];
  for (const gameInstance of await allInstances(userId)) {
    const game = getGame(gameInstance.gameKey);
    if (!game) continue;
    if (filter && !game.name.toLowerCase().includes(filter.toLowerCase())) continue;
    const left = await undoneDailies(userId, gameInstance, game);
    lines.push(`__**${game.name}**__ — ${fmtCurrencies(game, gameInstance.currencies)}`);
    lines.push(left.length ? `   dailies left: ${left.join(", ")}` : "   ✅ dailies done");
  }
  return lines.length ? lines.join("\n").slice(0, 1900) : "No games found.";
}

async function handleCurrency(options: CommandOptions, userId: string) {
  const name = stringOption(options, "game");
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) return `No game matching "${name}".`;
  return `**${found.game.name}** — ${fmtCurrencies(found.game, found.gi.currencies)}`.slice(0, 1900);
}

async function handleUpdate(options: CommandOptions, userId: string) {
  const name = stringOption(options, "game");
  const currencyName = stringOption(options, "currency");
  const value = numberOption(options, "value");
  if (Number.isNaN(value) || value < 0) return "Value must be a non-negative number.";
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) return `No game matching "${name}".`;
  const lower = currencyName.toLowerCase();
  const cur = found.game.currencies.find(
    (currency) => currency.key.toLowerCase() === lower || currency.label.toLowerCase() === lower,
  );
  if (!cur) return `No currency "${currencyName}" in ${found.game.name}.`;
  await prisma.currencyState.upsert({
    where: { gameInstanceId_key: { gameInstanceId: found.gi.id, key: cur.key } },
    create: { gameInstanceId: found.gi.id, key: cur.key, value },
    update: { value },
  });
  await recordDays(userId);
  return `✅ ${found.game.name}: **${cur.label}** = ${value}`;
}

async function handleDone(options: CommandOptions, userId: string) {
  const name = stringOption(options, "game");
  const taskName = stringOption(options, "task");
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) return `No game matching "${name}".`;
  const tasks = await prisma.task.findMany({
    where: { userId, scope: "game", refId: found.gi.id, type: "recurring" },
  });
  const lower = taskName.toLowerCase();
  const task = tasks.find((candidate) => candidate.title.toLowerCase().includes(lower));
  if (!task) return `No task matching "${taskName}".`;
  await prisma.task.update({ where: { id: task.id }, data: { lastCompletedAt: new Date() } });
  await recordDays(userId);
  return `✅ Marked done: **${task.title}**`;
}

async function handleGoal(options: CommandOptions, userId: string) {
  const taskName = stringOption(options, "task");
  const progress = numberOption(options, "progress");
  if (Number.isNaN(progress) || progress < 0) return "Progress must be a non-negative number.";
  const tasks = await prisma.task.findMany({ where: { userId, type: "goal" } });
  const lower = taskName.toLowerCase();
  const task = tasks.find((candidate) => candidate.title.toLowerCase().includes(lower));
  if (!task) return `No goal matching "${taskName}".`;
  await prisma.task.update({ where: { id: task.id }, data: { progress } });
  await recordDays(userId);
  const target = task.target ? `/${task.target}` : "";
  return `🎯 **${task.title}**: ${progress}${target}`;
}

/** Generic summary that works for any game's bespoke character doc. */
function summarizeDoc(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "_empty_";
  const lines: string[] = [];
  for (const [key, value] of Object.entries(doc as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object") {
      const count = Array.isArray(value) ? value.length : Object.keys(value).length;
      if (count > 0) lines.push(`${key}: ${count}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join(" · ") || "_empty_";
}

async function handleBuild(options: CommandOptions, userId: string) {
  const name = stringOption(options, "game");
  const charName = stringOption(options, "character");
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) return `No game matching "${name}".`;
  const candidates = await prisma.character.findMany({ where: { gameInstanceId: found.gi.id } });
  const lowerName = charName.toLowerCase();
  const character = candidates.find((candidate) => candidate.name.toLowerCase().includes(lowerName)) ?? null;
  if (!character) return `No character matching "${charName}".`;
  return `**${character.name}** — ${found.game.name}\n${summarizeDoc(character.doc)}`.slice(0, 1900);
}

/** The user's installed games, optionally narrowed by a name filter. */
async function gamesFor(userId: string, filter: string) {
  const out: { gi: InstanceWithData; game: GameDefinition }[] = [];
  for (const gameInstance of await allInstances(userId)) {
    const game = getGame(gameInstance.gameKey);
    if (!game) continue;
    if (filter && !game.name.toLowerCase().includes(filter.toLowerCase()) && game.key !== filter.toLowerCase()) continue;
    out.push({ gi: gameInstance, game });
  }
  return out;
}

const STATUS_ICON = { active: "🟢", upcoming: "🕒", ended: "⚫" } as const;

async function handleTimeline(options: CommandOptions, userId: string, kind: "banners" | "events") {
  const games = await gamesFor(userId, stringOption(options, "game"));
  if (games.length === 0) return "No games found.";
  const now = new Date();
  const lines: string[] = [];
  for (const { game } of games) {
    const items = kind === "banners" ? await listBanners([game.key], "current", now) : await listEvents([game.key], "current", now);
    if (items.length === 0) continue;
    lines.push(`__**${game.name}**__`);
    const loadedCatalog = kind === "banners" ? await getCatalog(game) : null;
    for (const item of items) {
      const when = item.status === "upcoming" ? `starts in ${formatRemaining(item.startsAt, now)}` : `ends in ${formatRemaining(item.endsAt, now)}`;
      let line = `${STATUS_ICON[item.status]} **${item.name}** — ${when}`;
      if ("featured" in item && item.featured.length) {
        const names = item.featured.map((featuredUnit) =>
          (featuredUnit.kind === "character" ? loadedCatalog?.index.characters.get(featuredUnit.catalogId)?.name : loadedCatalog?.index.weapons.get(featuredUnit.catalogId)?.name) ?? featuredUnit.catalogId,
        );
        line += `\n   featured: ${names.join(", ")}`;
      }
      lines.push(line);
    }
  }
  return lines.length ? lines.join("\n").slice(0, 1900) : `No current or upcoming ${kind}.`;
}

/** Rotating materials you're short on that are farmable today (per region). */
async function handleFarm(options: CommandOptions, userId: string) {
  const games = await gamesFor(userId, stringOption(options, "game"));
  if (games.length === 0) return "No games found.";
  const lines: string[] = [];
  for (const { gi: gameInstance, game } of games) {
    const loadedCatalog = await getCatalog(game);
    if (!loadedCatalog) continue;
    const [tasks, stock] = await Promise.all([
      prisma.task.findMany({ where: { userId, scope: "game", refId: gameInstance.id, type: "goal", materialId: { not: null } } }),
      prisma.materialStock.findMany({ where: { gameInstanceId: gameInstance.id } }),
    ]);
    const have = new Map(stock.map((stockRow) => [stockRow.materialId, stockRow.qty]));
    const need = new Map<string, number>();
    for (const task of tasks) need.set(task.materialId!, (need.get(task.materialId!) ?? 0) + Math.max(0, task.target ?? 0));
    const weekday = gameWeekday(regionForInstance(game, gameInstance), new Date());
    const today: string[] = [];
    let missingRotating = 0;
    for (const [id, neededCount] of need) {
      const missing = neededCount - (have.get(id) ?? 0);
      const material = loadedCatalog.index.materials.get(id);
      if (missing <= 0 || !material?.availability?.length) continue;
      missingRotating += 1;
      if (farmableToday(material.availability, weekday)) today.push(`${material.name} ×${missing}`);
    }
    if (today.length) lines.push(`__**${game.name}**__ today: ${today.join(", ")}`);
    else if (missingRotating) lines.push(`__**${game.name}**__: nothing you're short on rotates in today`);
  }
  return lines.length ? lines.join("\n").slice(0, 1900) : "No rotating materials needed — plan something from a character screen first.";
}

async function handleOwn(options: CommandOptions, userId: string) {
  const name = stringOption(options, "game");
  const charName = stringOption(options, "character");
  const owned = typeof options.owned === "boolean" ? options.owned : true;
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) return `No game matching "${name}".`;
  const loadedCatalog = await getCatalog(found.game);
  if (!loadedCatalog) return `${found.game.name} has no character catalog yet.`;
  const lowerName = charName.toLowerCase();
  const entry =
    loadedCatalog.catalog.characters.find((character) => character.name.toLowerCase() === lowerName) ??
    loadedCatalog.catalog.characters.find((character) => character.name.toLowerCase().includes(lowerName));
  if (!entry) return `No character matching "${charName}" in ${found.game.name}.`;
  const where = { gameInstanceId_kind_catalogId: { gameInstanceId: found.gi.id, kind: "character", catalogId: entry.id } };
  if (owned) {
    await prisma.ownership.upsert({ where, create: { gameInstanceId: found.gi.id, kind: "character", catalogId: entry.id }, update: {} });
    return `✅ ${found.game.name}: you now own **${entry.name}**.`;
  }
  await prisma.ownership.deleteMany({ where: { gameInstanceId: found.gi.id, kind: "character", catalogId: entry.id } });
  return `➖ ${found.game.name}: **${entry.name}** marked as not owned.`;
}
