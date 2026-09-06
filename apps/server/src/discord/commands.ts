import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";
import type { Account, GameInstance } from "@prisma/client";
import { getGame, type GameDefinition, type TaskCadence } from "@gacha/shared";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { isDoneThisCycle } from "../lib/resets.js";
import { regionForAccount } from "../api/util.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Overview of your currencies and outstanding dailies")
    .addStringOption((o) => o.setName("game").setDescription("Filter to one game").setRequired(false)),
  new SlashCommandBuilder()
    .setName("currency")
    .setDescription("Show currencies for a game")
    .addStringOption((o) => o.setName("game").setDescription("Game name").setRequired(true)),
  new SlashCommandBuilder()
    .setName("update")
    .setDescription("Set a currency value")
    .addStringOption((o) => o.setName("game").setDescription("Game name").setRequired(true))
    .addStringOption((o) => o.setName("currency").setDescription("Currency name/key").setRequired(true))
    .addNumberOption((o) => o.setName("value").setDescription("New value").setRequired(true)),
  new SlashCommandBuilder()
    .setName("done")
    .setDescription("Mark a recurring task complete for this cycle")
    .addStringOption((o) => o.setName("game").setDescription("Game name").setRequired(true))
    .addStringOption((o) => o.setName("task").setDescription("Task title").setRequired(true)),
  new SlashCommandBuilder()
    .setName("goal")
    .setDescription("Update a farming goal's progress")
    .addStringOption((o) => o.setName("task").setDescription("Goal title").setRequired(true))
    .addNumberOption((o) => o.setName("progress").setDescription("Current progress").setRequired(true)),
  new SlashCommandBuilder()
    .setName("build")
    .setDescription("Show a character's build summary")
    .addStringOption((o) => o.setName("game").setDescription("Game name").setRequired(true))
    .addStringOption((o) => o.setName("character").setDescription("Character name").setRequired(true)),
].map((c) => c.toJSON());

type InstanceWithData = GameInstance & {
  accounts: (Account & { currencies: { key: string; value: number }[] })[];
};

async function findUser(discordId: string) {
  return prisma.user.findUnique({ where: { discordId } });
}

async function allInstances(userId: string): Promise<InstanceWithData[]> {
  return (await prisma.gameInstance.findMany({
    where: { userId },
    include: { accounts: { include: { currencies: true }, orderBy: { createdAt: "asc" } } },
  })) as InstanceWithData[];
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

async function undoneDailies(userId: string, account: Account, game: GameDefinition) {
  const tasks = await prisma.task.findMany({
    where: { userId, scope: "account", refId: account.id, type: "recurring" },
  });
  const region = regionForAccount(game, account);
  const now = new Date();
  return tasks
    .filter(
      (t) => !isDoneThisCycle(t.lastCompletedAt, now, region, (t.cadence as TaskCadence) ?? "daily"),
    )
    .map((t) => t.title);
}

const LINK_HINT = `You have no linked account yet. Sign in with Discord at ${config.appBaseUrl} first.`;

export async function handleInteraction(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;
  const i = interaction as ChatInputCommandInteraction;
  const user = await findUser(i.user.id);
  if (!user) {
    await i.reply({ content: LINK_HINT, ephemeral: true });
    return;
  }
  switch (i.commandName) {
    case "status": return handleStatus(i, user.id);
    case "currency": return handleCurrency(i, user.id);
    case "update": return handleUpdate(i, user.id);
    case "done": return handleDone(i, user.id);
    case "goal": return handleGoal(i, user.id);
    case "build": return handleBuild(i, user.id);
    default: await i.reply({ content: "Unknown command.", ephemeral: true });
  }
}

async function handleStatus(i: ChatInputCommandInteraction, userId: string) {
  const filter = i.options.getString("game");
  const instances = await allInstances(userId);
  const lines: string[] = [];
  for (const gi of instances) {
    const game = getGame(gi.gameKey);
    if (!game) continue;
    if (filter && !game.name.toLowerCase().includes(filter.toLowerCase())) continue;
    lines.push(`__**${game.name}**__`);
    for (const acc of gi.accounts) {
      const left = await undoneDailies(userId, acc, game);
      lines.push(`• **${acc.label}** — ${fmtCurrencies(game, acc.currencies)}`);
      lines.push(left.length ? `   dailies left: ${left.join(", ")}` : "   ✅ dailies done");
    }
  }
  await i.reply({
    content: lines.length ? lines.join("\n").slice(0, 1900) : "No games found.",
    ephemeral: true,
  });
}

async function handleCurrency(i: ChatInputCommandInteraction, userId: string) {
  const name = i.options.getString("game", true);
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) {
    await i.reply({ content: `No game matching "${name}".`, ephemeral: true });
    return;
  }
  const lines = found.gi.accounts.map(
    (acc) => `**${acc.label}** — ${fmtCurrencies(found.game, acc.currencies)}`,
  );
  await i.reply({
    content: `**${found.game.name}**\n${lines.join("\n")}`.slice(0, 1900),
    ephemeral: true,
  });
}

async function handleUpdate(i: ChatInputCommandInteraction, userId: string) {
  const name = i.options.getString("game", true);
  const currencyName = i.options.getString("currency", true);
  const value = i.options.getNumber("value", true);
  const found = resolveInstance(await allInstances(userId), name);
  if (!found || found.gi.accounts.length === 0) {
    await i.reply({ content: `No game/account for "${name}".`, ephemeral: true });
    return;
  }
  const lower = currencyName.toLowerCase();
  const cur = found.game.currencies.find(
    (c) => c.key.toLowerCase() === lower || c.label.toLowerCase() === lower,
  );
  if (!cur) {
    await i.reply({ content: `No currency "${currencyName}" in ${found.game.name}.`, ephemeral: true });
    return;
  }
  const account = found.gi.accounts[0]!;
  await prisma.currencyState.upsert({
    where: { accountId_key: { accountId: account.id, key: cur.key } },
    create: { accountId: account.id, key: cur.key, value },
    update: { value },
  });
  await i.reply({
    content: `✅ ${found.game.name} · ${account.label}: **${cur.label}** = ${value}`,
    ephemeral: true,
  });
}

async function handleDone(i: ChatInputCommandInteraction, userId: string) {
  const name = i.options.getString("game", true);
  const taskName = i.options.getString("task", true);
  const found = resolveInstance(await allInstances(userId), name);
  if (!found || found.gi.accounts.length === 0) {
    await i.reply({ content: `No game/account for "${name}".`, ephemeral: true });
    return;
  }
  const accountIds = found.gi.accounts.map((a) => a.id);
  const tasks = await prisma.task.findMany({
    where: { userId, scope: "account", refId: { in: accountIds }, type: "recurring" },
  });
  const lower = taskName.toLowerCase();
  const task = tasks.find((t) => t.title.toLowerCase().includes(lower));
  if (!task) {
    await i.reply({ content: `No task matching "${taskName}".`, ephemeral: true });
    return;
  }
  await prisma.task.update({ where: { id: task.id }, data: { lastCompletedAt: new Date() } });
  await i.reply({ content: `✅ Marked done: **${task.title}**`, ephemeral: true });
}

async function handleGoal(i: ChatInputCommandInteraction, userId: string) {
  const taskName = i.options.getString("task", true);
  const progress = i.options.getNumber("progress", true);
  const tasks = await prisma.task.findMany({ where: { userId, type: "goal" } });
  const lower = taskName.toLowerCase();
  const task = tasks.find((t) => t.title.toLowerCase().includes(lower));
  if (!task) {
    await i.reply({ content: `No goal matching "${taskName}".`, ephemeral: true });
    return;
  }
  await prisma.task.update({ where: { id: task.id }, data: { progress } });
  const target = task.target ? `/${task.target}` : "";
  await i.reply({ content: `🎯 **${task.title}**: ${progress}${target}`, ephemeral: true });
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

async function handleBuild(i: ChatInputCommandInteraction, userId: string) {
  const name = i.options.getString("game", true);
  const charName = i.options.getString("character", true);
  const found = resolveInstance(await allInstances(userId), name);
  if (!found) {
    await i.reply({ content: `No game matching "${name}".`, ephemeral: true });
    return;
  }
  const accountIds = found.gi.accounts.map((a) => a.id);
  const candidates = await prisma.character.findMany({ where: { accountId: { in: accountIds } } });
  const lc = charName.toLowerCase();
  const character = candidates.find((c) => c.name.toLowerCase().includes(lc)) ?? null;
  if (!character) {
    await i.reply({ content: `No character matching "${charName}".`, ephemeral: true });
    return;
  }
  await i.reply({
    content: `**${character.name}** — ${found.game.name}\n${summarizeDoc(character.doc)}`.slice(0, 1900),
    ephemeral: true,
  });
}
