import type { GameInstance } from "@prisma/client";
import { getGame, type GameDefinition, type TaskCadence } from "@gacha/shared";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { isDoneThisCycle } from "../lib/resets.js";
import { regionForInstance } from "../api/util.js";

/* Slash command definitions as plain Discord API JSON (no discord.js).
 * Option types: 3 = STRING, 10 = NUMBER. */
const STRING = 3;
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
];

/** Normalized options from an interaction payload. */
export type CommandOptions = Record<string, string | number | undefined>;

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
