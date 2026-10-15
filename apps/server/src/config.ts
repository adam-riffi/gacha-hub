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

function envString(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}
function bool(name: string, fallback = false): boolean {
  const envValue = process.env[name];
  if (envValue === undefined) return fallback;
  return envValue === "true" || envValue === "1";
}
function int(name: string, fallback: number): number {
  const envValue = process.env[name];
  if (envValue === undefined) return fallback;
  const parsedNumber = Number.parseInt(envValue, 10);
  return Number.isNaN(parsedNumber) ? fallback : parsedNumber;
}

const isProd = envString("NODE_ENV") === "production";

export const config = {
  isProd,
  port: int("PORT", 3000),
  appBaseUrl: envString("APP_BASE_URL", "http://localhost:3000").replace(/\/$/, ""),
  sessionSecret: envString(
    "SESSION_SECRET",
    "dev-insecure-session-secret-change-me-32chars",
  ),
  cookieSecure: bool("COOKIE_SECURE", isProd),
  databaseUrl: envString("DATABASE_URL"),
  uploadDir: envString("UPLOAD_DIR", "./uploads"),
  /** Vercel Blob token; when set, uploads go to Blob instead of local disk. */
  blobToken: envString("BLOB_READ_WRITE_TOKEN"),

  /** Shared secret the external cron (GitHub Actions) sends to /api/cron/tick. */
  cronSecret: envString("CRON_SECRET"),
  /** Run node-cron in-process (only for always-on hosts like Docker). */
  inProcessCron: bool("ENABLE_INPROCESS_CRON", false),
  /** The owner's Discord id (ADR 0010): it finds the owner's account (the one the Discord sign-in made); comma-separated. */
  adminDiscordIds: envString("ADMIN_DISCORD_IDS")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean),

  discord: {
    botToken: envString("DISCORD_BOT_TOKEN"),
    appId: envString("DISCORD_APP_ID"),
    /** Application public key — verifies HTTP Interactions signatures. */
    publicKey: envString("DISCORD_PUBLIC_KEY"),
    devGuildId: envString("DISCORD_DEV_GUILD_ID"),
  },

  /** The owner password's scrypt hash (ADR 0010; made by `npm run password:hash`), read on each use; empty: no password sign-in. */
  get ownerPasswordHash(): string {
    return envString("OWNER_PASSWORD_HASH");
  },

  /** Dev-only shortcut login (no Discord app needed). Never on in production. */
  devLoginEnabled: !isProd && bool("DEV_LOGIN_ENABLED", true),
} as const;

/** Bot token + app id: needed for REST (DMs) and slash-command registration. */
export const hasDiscordBot = () =>
  Boolean(config.discord.botToken && config.discord.appId);
/** Public key: needed to accept slash commands over HTTP Interactions. */
export const hasDiscordInteractions = () => Boolean(config.discord.publicKey);
