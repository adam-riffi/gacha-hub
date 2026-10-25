import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../config.js";
import { loadArtStore } from "./artStoreKeys.js";

/** The pictures the app takes, by type, with their file's extension. */
export const IMAGE_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

/**
 * Stores a picture under a random name and returns its URL: the R2 art store when Settings → Keys names one (ADR 0014;
 * serverless has no persistent disk), after the budget check, otherwise the local upload folder served by the
 * always-on server.
 */
export async function storeImage(fileBuffer: Buffer, mimetype: string): Promise<string> {
  const name = randomBytes(16).toString("hex") + IMAGE_TYPES.get(mimetype)!;
  const store = await loadArtStore();
  if (store) {
    await store.assertBudget({ classA: 1, bytes: fileBuffer.length });
    return store.put(`uploads/${name}`, fileBuffer, mimetype);
  }
  // resolve() already starts from the working directory. Spelling out
  // process.cwd() makes Vercel's file trace ship the whole repository.
  const dir = resolve(config.uploadDir);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, name), fileBuffer);
  return `/uploads/${name}`;
}
