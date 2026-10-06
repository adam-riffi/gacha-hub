// Runs the bundle harnesses on a throwaway SQLite database, so they never read
// or dirty the dev database. `npm run harness` builds the bundle first.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const env = { ...process.env, DATABASE_URL: "file:./harness.db" };
const clean = () => {
  for (const suffix of ["", "-journal"]) rmSync(resolve(root, `prisma/harness.db${suffix}`), { force: true });
};
const run = (args) => execFileSync(process.execPath, args, { cwd: root, env, stdio: "inherit" });

clean();
try {
  run([resolve(root, "scripts/gen-sqlite-schema.mjs")]);
  // Also generates the SQLite Prisma client the bundle loads.
  run([resolve(root, "node_modules/prisma/build/index.js"), "db", "push", "--schema", "prisma/schema.sqlite.prisma", "--accept-data-loss"]);
  for (const phase of ["phase7.mjs", "phase8.mjs"]) run([resolve(root, "scripts/harness", phase)]);
} finally {
  clean();
}
