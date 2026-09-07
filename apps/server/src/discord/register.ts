import { pathToFileURL } from "node:url";
import { config, hasDiscordBot } from "../config.js";
import { commands } from "./commands.js";
import { discordFetch } from "./rest.js";

/** Register slash commands with Discord (guild-scoped in dev, else global). */
export async function registerCommands(): Promise<void> {
  if (!hasDiscordBot()) {
    console.warn("[discord] cannot register commands — token/app id missing.");
    return;
  }
  const { appId, devGuildId } = config.discord;
  const path = devGuildId
    ? `/applications/${appId}/guilds/${devGuildId}/commands`
    : `/applications/${appId}/commands`;
  const res = await discordFetch(path, { method: "PUT", body: JSON.stringify(commands) });
  if (!res.ok) {
    throw new Error(`Command registration failed: ${res.status} ${await res.text()}`);
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
