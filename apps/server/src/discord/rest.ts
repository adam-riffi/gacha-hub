import { config, hasDiscordBot } from "../config.js";

/**
 * Minimal Discord REST client (no gateway). Enough for DMs and slash-command
 * registration, which is all a serverless deployment needs.
 */
const API = "https://discord.com/api/v10";

export async function discordFetch(path: string, init: RequestInit = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${config.discord.botToken}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/** DM a user by Discord id. Returns whether it was delivered. */
export async function sendDirectMessage(
  discordId: string,
  content: string,
): Promise<boolean> {
  if (!hasDiscordBot()) return false;
  try {
    const channelRes = await discordFetch("/users/@me/channels", {
      method: "POST",
      body: JSON.stringify({ recipient_id: discordId }),
    });
    if (!channelRes.ok) return false;
    const channel = (await channelRes.json()) as { id: string };
    const msgRes = await discordFetch(`/channels/${channel.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    return msgRes.ok;
  } catch (err) {
    console.error(`[discord] DM to ${discordId} failed:`, err);
    return false;
  }
}
