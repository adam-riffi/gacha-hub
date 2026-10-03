#!/usr/bin/env node
/**
 * Sync game art from a Google Drive folder into apps/web/public/assets.
 *
 * Drive is treated as a *drop-box*: mirror the same tree you'd have on disk
 *   <folder>/<gameKey>/<kind>/<key>.webp
 * (e.g. genshin/portrait/UI_AvatarIcon_Arlecchino.webp) and this script walks
 * it recursively and downloads every file into the matching local path. The app
 * still serves the files statically — Drive is never hit at runtime (it throttles
 * image hotlinking and hands out unstable URLs).
 *
 * Auth: this uses the Drive v3 REST API with an API key, which only works for a
 * folder shared as "Anyone with the link". For a *private* folder use a service
 * account (install `googleapis`, share the folder with the service-account email,
 * and swap `listFolder`/`download` for authenticated calls) — see README.
 *
 * Env:
 *   GDRIVE_FOLDER_ID   root folder id (from its share URL) — required
 *   GDRIVE_API_KEY     Google API key with Drive API enabled — required here
 *   ASSET_OUT_DIR      output root (default: apps/web/public/assets)
 *
 * Usage:  node scripts/assets/sync-drive.mjs [--dry]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FOLDER = process.env.GDRIVE_FOLDER_ID;
const KEY = process.env.GDRIVE_API_KEY;
const DRY = process.argv.includes("--dry");
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_ROOT = process.env.ASSET_OUT_DIR
  ? resolve(process.env.ASSET_OUT_DIR)
  : join(REPO_ROOT, "apps/web/public/assets");

const FOLDER_MIME = "application/vnd.google-apps.folder";
const API = "https://www.googleapis.com/drive/v3/files";

if (!FOLDER || !KEY) {
  console.error(
    "Missing GDRIVE_FOLDER_ID and/or GDRIVE_API_KEY.\n" +
      "Share the Drive folder as 'Anyone with the link', then:\n" +
      "  GDRIVE_FOLDER_ID=<id> GDRIVE_API_KEY=<key> node scripts/assets/sync-drive.mjs",
  );
  process.exit(1);
}

/** List one folder's immediate children (paginated). */
async function listFolder(id) {
  const out = [];
  let pageToken;
  do {
    const params = new URLSearchParams({
      q: `'${id}' in parents and trashed=false`,
      key: KEY,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) throw new Error(`list ${id} → ${res.status} ${await res.text()}`);
    const json = await res.json();
    out.push(...(json.files ?? []));
    pageToken = json.nextPageToken;
  } while (pageToken);
  return out;
}

async function download(id) {
  const res = await fetch(`${API}/${id}?alt=media&key=${KEY}`);
  if (!res.ok) throw new Error(`download ${id} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

let files = 0;
let bytes = 0;

/** Recursively mirror a Drive folder into `relDir` under OUT_ROOT. */
async function walk(folderId, relDir) {
  for (const f of await listFolder(folderId)) {
    const rel = relDir ? `${relDir}/${f.name}` : f.name;
    if (f.mimeType === FOLDER_MIME) {
      await walk(f.id, rel);
    } else {
      files++;
      if (DRY) {
        console.log("would fetch", rel);
        continue;
      }
      const buf = await download(f.id);
      const dest = join(OUT_ROOT, rel);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, buf);
      bytes += buf.length;
      console.log("✓", rel, `(${(buf.length / 1024).toFixed(0)} KB)`);
    }
  }
}

await walk(FOLDER, "");
console.log(
  `\n${DRY ? "[dry] " : ""}${files} file(s)` +
    (DRY ? "" : `, ${(bytes / 1024 / 1024).toFixed(2)} MB → ${OUT_ROOT}`),
);
