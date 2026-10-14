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
  for (const part of (raw ?? "").split(",").map((segment) => segment.trim()).filter(Boolean)) {
    const match = /^(\d+):(.+)$/.exec(part);
    const key = Buffer.from(match ? match[2]! : part, "base64");
    if (key.length !== 32) throw new Error("LINK_SECRET_KEY: each key must be 32 bytes, base64");
    keys.set(match ? Number(match[1]) : 1, key);
  }
  if (!keys.size) throw new Error("LINK_SECRET_KEY is not set");
  return { current: Math.max(...keys.keys()), keys };
}

/** "iv.tag.data", each base64, under the newest key. */
export function sealSecret(plain: string, row: string, keys: LinkKeys): { secret: string; keyVersion: number } {
  const initVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys.keys.get(keys.current)!, initVector).setAAD(Buffer.from(row));
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { secret: [initVector, cipher.getAuthTag(), data].map((chunk) => chunk.toString("base64")).join("."), keyVersion: keys.current };
}

/** Opens a sealed secret; throws if it was altered, moved to another row, or its key is gone. */
export function openSecret(secret: string, keyVersion: number, row: string, keys: LinkKeys): string {
  const key = keys.keys.get(keyVersion);
  if (!key) throw new Error(`No LINK_SECRET_KEY for key version ${keyVersion}`);
  const [initVector, tag, data] = secret.split(".").map((encoded) => Buffer.from(encoded, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, initVector!).setAAD(Buffer.from(row));
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(data!), decipher.final()]).toString("utf8");
}
