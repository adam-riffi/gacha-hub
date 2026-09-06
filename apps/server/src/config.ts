import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Load the repo-root .env (Node's built-in loader; no dotenv dependency).
// In production these vars are injected by the host, so a missing file is fine.
const here = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(here, "../../../.env"), // apps/server/src -> repo root
  resolve(process.cwd(), ".env"),
]) {
  if (existsSync(candidate)) {
    try {
      process.loadEnvFile(candidate);
    } catch {
      /* ignore */
    }
    break;
  }
}

function str(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}
function bool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === "true" || v === "1";
}
function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

const isProd = str("NODE_ENV") === "production";

export const config = {
  isProd,
  port: int("PORT", 3000),
  appBaseUrl: str("APP_BASE_URL", "http://localhost:3000").replace(/\/$/, ""),
  sessionSecret: str(
    "SESSION_SECRET",
    "dev-insecure-session-secret-change-me-32chars",
  ),
  cookieSecure: bool("COOKIE_SECURE", isProd),
  databaseUrl: str("DATABASE_URL"),
  uploadDir: str("UPLOAD_DIR", "./uploads"),

  discord: {
    clientId: str("DISCORD_CLIENT_ID"),
    clientSecret: str("DISCORD_CLIENT_SECRET"),
    oauthRedirect: str(
      "DISCORD_OAUTH_REDIRECT",
      "http://localhost:3000/api/auth/discord/callback",
    ),
    botToken: str("DISCORD_BOT_TOKEN"),
    appId: str("DISCORD_APP_ID"),
    devGuildId: str("DISCORD_DEV_GUILD_ID"),
  },

  /** Dev-only shortcut login (no Discord app needed). Never on in production. */
  devLoginEnabled: !isProd && bool("DEV_LOGIN_ENABLED", true),
} as const;

export const hasDiscordOAuth = () =>
  Boolean(config.discord.clientId && config.discord.clientSecret);
export const hasDiscordBot = () =>
  Boolean(config.discord.botToken && config.discord.appId);
