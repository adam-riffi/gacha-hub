import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Tokens users give us to sync their game accounts (ADR 0005), encrypted at
 * rest with AES-256-GCM. The row's identity ("userId:provider") is the
 * additional data, so a secret copied to another row does not open.
 */
export type LinkKeys = { current: number; keys: Map<number, Buffer> };

/**
 * Reads LINK_SECRET_KEY: one base64 key (version 1), or "2:key,1:key" while
 * rotating. The highest version seals; every listed version opens.
 */
export function linkKeys(raw: string | undefined = process.env.LINK_SECRET_KEY): LinkKeys {
  const keys = new Map<number, Buffer>();
  for (const part of (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d+):(.+)$/.exec(part);
    const key = Buffer.from(m ? m[2]! : part, "base64");
    if (key.length !== 32) throw new Error("LINK_SECRET_KEY: each key must be 32 bytes, base64");
    keys.set(m ? Number(m[1]) : 1, key);
  }
  if (!keys.size) throw new Error("LINK_SECRET_KEY is not set");
  return { current: Math.max(...keys.keys()), keys };
}

/** "iv.tag.data", each base64, under the newest key. */
export function sealSecret(plain: string, row: string, k: LinkKeys): { secret: string; keyVersion: number } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k.keys.get(k.current)!, iv).setAAD(Buffer.from(row));
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { secret: [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join("."), keyVersion: k.current };
}

/** Opens a sealed secret; throws if it was altered, moved to another row, or its key is gone. */
export function openSecret(secret: string, keyVersion: number, row: string, k: LinkKeys): string {
  const key = k.keys.get(keyVersion);
  if (!key) throw new Error(`No LINK_SECRET_KEY for key version ${keyVersion}`);
  const [iv, tag, data] = secret.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv!).setAAD(Buffer.from(row));
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(data!), decipher.final()]).toString("utf8");
}
