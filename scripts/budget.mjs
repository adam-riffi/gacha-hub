// Performance budget (ENGINEERING.md §13, DESIGN.md §13): the JavaScript the
// built shell loads up front — its entry scripts and modulepreloads — must stay
// under BUDGET_KB gzipped. Catalogs and other lazy chunks are not counted.
// Run after `npm run build -w @gacha/web`.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const BUDGET_KB = Number(process.env.BUDGET_KB ?? 200);
const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/web/dist");
const html = readFileSync(resolve(dist, "index.html"), "utf8");

const initial = [
  ...html.matchAll(/<script[^>]*\ssrc="(\/assets\/[^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="(\/assets\/[^"]+\.js)"/g),
].map((m) => m[1]);
if (initial.length === 0) {
  console.error("budget: no entry script found in apps/web/dist/index.html");
  process.exit(2);
}

let total = 0;
for (const file of new Set(initial)) {
  const kb = gzipSync(readFileSync(resolve(dist, `.${file}`))).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(7)} KB  ${file}`);
}
console.log(`${total.toFixed(1).padStart(7)} KB  initial JavaScript, gzipped (budget ${BUDGET_KB} KB)`);
if (total > BUDGET_KB) {
  console.error(`budget: initial JavaScript is ${(total - BUDGET_KB).toFixed(1)} KB over budget`);
  process.exit(1);
}
