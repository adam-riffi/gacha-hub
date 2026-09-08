// Strip stray HTML/markup tags (e.g. "<i>The Fluffy</i>") and decode a few
// entities from committed catalog JSON — some upstream datasets leave rich-text
// formatting in names. Idempotent; run: node scripts/strip-catalog-tags.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const games = ["genshin", "hsr", "wuwa", "endfield"];
// Fields whose string values are user-facing text worth cleaning.
const TEXT_KEYS = new Set(["name", "description", "source", "category"]);

const clean = (s) =>
  s
    .replace(/<[^>]+>/g, "") // tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .trim();

let totalChanged = 0;
function walk(node, keyHint) {
  if (typeof node === "string") return keyHint && TEXT_KEYS.has(keyHint) ? clean(node) : node;
  if (Array.isArray(node)) return node.map((v) => walk(v, keyHint));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = walk(v, k);
    return out;
  }
  return node;
}

for (const game of games) {
  const path = resolve(root, `packages/shared/src/games/${game}/catalog.json`);
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  const obj = JSON.parse(raw);
  const cleanedObj = walk(obj);
  // Only touch files whose data actually changed (leave tag-free catalogs as-is).
  if (JSON.stringify(cleanedObj) === JSON.stringify(obj)) continue;
  writeFileSync(path, JSON.stringify(cleanedObj, null, 2) + (raw.endsWith("\n") ? "\n" : ""));
  totalChanged += 1;
  console.log(`cleaned ${game}/catalog.json`);
}
console.log(totalChanged ? `Updated ${totalChanged} catalog file(s).` : "No tags found.");
