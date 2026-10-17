import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../config.js";

/** The pictures the app takes, by type, with their file's extension. */
export const IMAGE_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

/**
 * Stores a picture under a random name and returns its URL: Vercel Blob when
 * BLOB_READ_WRITE_TOKEN is set (serverless has no persistent disk), otherwise
 * the local upload folder served by the always-on server.
 */
export async function storeImage(fileBuffer: Buffer, mimetype: string): Promise<string> {
  const name = randomBytes(16).toString("hex") + IMAGE_TYPES.get(mimetype)!;
  if (config.blobToken) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${name}`, fileBuffer, { access: "public", contentType: mimetype, token: config.blobToken });
    return blob.url;
  }
  // resolve() already starts from the working directory. Spelling out
  // process.cwd() makes Vercel's file trace ship the whole repository.
  const dir = resolve(config.uploadDir);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, name), fileBuffer);
  return `/uploads/${name}`;
}
