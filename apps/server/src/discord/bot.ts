import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { config, hasDiscordBot } from "../config.js";
import { handleInteraction } from "./commands.js";

let client: Client | null = null;

export async function startBot(): Promise<void> {
  if (!hasDiscordBot()) {
    console.warn("[bot] DISCORD_BOT_TOKEN/APP_ID not set — bot disabled.");
    return;
  }
  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel],
  });
  client.once(Events.ClientReady, (c) => {
    console.log(`[bot] logged in as ${c.user.tag}`);
  });
  client.on(Events.InteractionCreate, (interaction) => {
    handleInteraction(interaction).catch((err) =>
      console.error("[bot] interaction error:", err),
    );
  });
  await client.login(config.discord.botToken);
}

export function getClient(): Client | null {
  return client;
}

/** DM a user by Discord id. Returns whether it was delivered. */
export async function sendDirectMessage(
  discordId: string,
  content: string,
): Promise<boolean> {
  if (!client) return false;
  try {
    const user = await client.users.fetch(discordId);
    await user.send({ content });
    return true;
  } catch (err) {
    console.error(`[bot] DM to ${discordId} failed:`, err);
    return false;
  }
}
