import { prisma } from "./prisma.js";
import { linkKeys, openSecret, sealSecret } from "./linkSecret.js";
import { OwnerPassword } from "../auth/ownerPassword.js";

type KeyDefinition = {
  group: string;
  label: string;
  /** What a well-formed value looks like; refused otherwise. */
  pattern: RegExp;
  /** Not a secret: its value is shown, so a typo can be seen. */
  shown?: boolean;
};

/**
 * The keys the owner may enter in Settings → Keys instead of the host's
 * environment (ADR 0012). The host's environment wins; what the app needs
 * before anyone can sign in or decrypt (the database, SESSION_SECRET, the
 * Discord sign-in client) stays on the host and is not listed here.
 */
export const APP_KEYS = {
  OWNER_PASSWORD_HASH: { group: "Sign-in", label: "Owner password", pattern: /^.{12,200}$/s },
  DISCORD_APP_ID: { group: "Discord bot", label: "Application ID", pattern: /^\d{17,20}$/, shown: true },
  DISCORD_BOT_TOKEN: { group: "Discord bot", label: "Bot token", pattern: /^[\w.-]{50,100}$/ },
  DISCORD_PUBLIC_KEY: { group: "Discord bot", label: "Public key", pattern: /^[0-9a-f]{64}$/i, shown: true },
  CRON_SECRET: { group: "Schedule", label: "Cron secret", pattern: /^[\x21-\x7e]{24,200}$/ },
  // Only hosts the Content-Security-Policy lets images come from (vercel.json): an R2 public bucket or Vercel Blob.
  ASSET_BASE: { group: "Art store", label: "Public URL", pattern: /^https:\/\/[a-z0-9-]+\.(r2\.dev|public\.blob\.vercel-storage\.com)(\/[\w./-]*)?$/, shown: true },
} satisfies Record<string, KeyDefinition>;

export type AppKeyName = keyof typeof APP_KEYS;

export const isAppKey = (name: string): name is AppKeyName => Object.hasOwn(APP_KEYS, name);

const rowOf = (name: AppKeyName) => `app:${name}`;

/** A key's value: the host's environment first, then the owner's sealed entry, else "". An entry the keys no longer open reads as unset. */
export async function readKey(name: AppKeyName): Promise<string> {
  const fromHost = process.env[name];
  if (fromHost) return fromHost;
  const row = await prisma.appSecret.findUnique({ where: { name } });
  if (!row) return "";
  try {
    return openSecret(row.secret, row.keyVersion, rowOf(name), linkKeys());
  } catch {
    return "";
  }
}

/** Every key with where it comes from; a secret's value never leaves the server. */
export async function listKeys() {
  const rows = new Map((await prisma.appSecret.findMany()).map((row) => [row.name, row]));
  return Promise.all(
    (Object.entries(APP_KEYS) as [AppKeyName, KeyDefinition][]).map(async ([name, definition]) => {
      const source = process.env[name] ? "host" : rows.has(name) ? "app" : null;
      const value = definition.shown && source ? await readKey(name) : undefined;
      return { name, group: definition.group, label: definition.label, shown: Boolean(definition.shown), source, ...(value === undefined ? {} : { value }), updatedAt: source === "app" ? rows.get(name)!.updatedAt : null };
    }),
  );
}

export type SetKeyResult = "saved" | "bad_value" | "set_on_host";

/** Seals the owner's entry; the owner password is typed and kept as its hash. */
export async function setKey(name: AppKeyName, value: string, actorUserId: string): Promise<SetKeyResult> {
  if (process.env[name]) return "set_on_host";
  const trimmed = name === "OWNER_PASSWORD_HASH" ? value : value.trim();
  if (!APP_KEYS[name].pattern.test(trimmed)) return "bad_value";
  const plain = name === "OWNER_PASSWORD_HASH" ? await OwnerPassword.hash(trimmed) : trimmed;
  const sealed = sealSecret(plain, rowOf(name), linkKeys());
  await prisma.$transaction([
    prisma.appSecret.upsert({ where: { name }, create: { name, ...sealed }, update: sealed }),
    prisma.auditLog.create({ data: { actorUserId, action: "set", targetKind: "key", targetKey: name } }),
  ]);
  return "saved";
}

/** Bot token + application id: needed for DMs and slash-command registration. */
export async function hasDiscordBot(): Promise<boolean> {
  const [token, appId] = await Promise.all([readKey("DISCORD_BOT_TOKEN"), readKey("DISCORD_APP_ID")]);
  return Boolean(token && appId);
}

export async function clearKey(name: AppKeyName, actorUserId: string): Promise<void> {
  await prisma.$transaction([
    prisma.appSecret.deleteMany({ where: { name } }),
    prisma.auditLog.create({ data: { actorUserId, action: "clear", targetKind: "key", targetKey: name } }),
  ]);
}
