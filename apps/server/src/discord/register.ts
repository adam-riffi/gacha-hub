import { pathToFileURL } from "node:url";
import { REST, Routes } from "discord.js";
import { config, hasDiscordBot } from "../config.js";
import { commands } from "./commands.js";

/** Register slash commands with Discord (guild-scoped in dev, else global). */
export async function registerCommands(): Promise<void> {
  if (!hasDiscordBot()) {
    console.warn("[bot] cannot register commands — token/app id missing.");
    return;
  }
  const rest = new REST({ version: "10" }).setToken(config.discord.botToken);
  if (config.discord.devGuildId) {
    await rest.put(
      Routes.applicationGuildCommands(
        config.discord.appId,
        config.discord.devGuildId,
      ),
      { body: commands },
    );
    console.log("[bot] registered guild slash commands (instant).");
  } else {
    await rest.put(Routes.applicationCommands(config.discord.appId), {
      body: commands,
    });
    console.log("[bot] registered global slash commands (may take ~1h).");
  }
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
