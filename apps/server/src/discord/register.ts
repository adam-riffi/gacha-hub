import { pathToFileURL } from "node:url";
import { config } from "../config.js";
import { hasDiscordBot, readKey } from "../lib/appKeys.js";
import { commands as coreCommands } from "./commands.js";
import { allGameBotCommands } from "../games/index.js";
import { discordFetch } from "./rest.js";

const commands = [...coreCommands, ...allGameBotCommands()];

/** Register slash commands with Discord (guild-scoped in dev, else global). */
export async function registerCommands(): Promise<void> {
  if (!(await hasDiscordBot())) {
    console.warn("[discord] cannot register commands — token/app id missing.");
    return;
  }
  const appId = await readKey("DISCORD_APP_ID");
  const { devGuildId } = config.discord;
  const path = devGuildId
    ? `/applications/${appId}/guilds/${devGuildId}/commands`
    : `/applications/${appId}/commands`;
  const response = await discordFetch(path, { method: "PUT", body: JSON.stringify(commands) });
  if (!response.ok) {
    throw new Error(`Command registration failed: ${response.status} ${await response.text()}`);
  }
  console.log(
    devGuildId
      ? "[discord] registered guild slash commands (instant)."
      : "[discord] registered global slash commands (may take ~1h).",
  );
}

// Allow: npm run discord:register
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  registerCommands()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
