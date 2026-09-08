// Provision a throwaway SQLite database for the server integration tests.
// Derives the SQLite schema from the single-source Postgres schema, then
// `db push`es it to prisma/test.db (dropping any prior state) — which also
// regenerates the Prisma client for the sqlite provider. Run before vitest;
// `npm test -w @gacha/server` does this automatically.
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schema = resolve(root, "prisma/schema.sqlite.prisma");
// Forward slashes: Prisma accepts them on every platform; a backslashed
// file: URL can confuse the runtime client on Windows.
const dbPath = resolve(root, "prisma/test.db").replace(/\\/g, "/");

// 1. Regenerate the sqlite schema variant from schema.prisma.
execFileSync(process.execPath, [resolve(root, "scripts/gen-sqlite-schema.mjs")], {
  stdio: "inherit",
});

// 2. Start from a clean file so each run is deterministic.
for (const suffix of ["", "-journal"]) {
  try {
    rmSync(dbPath + suffix);
  } catch {
    /* not there yet */
  }
}

// 3. Create the tables and (re)generate the client for sqlite. Invoke the
//    Prisma CLI's JS entry with node so this works the same on Windows and CI
//    (no .cmd shim, no shell quoting).
const env = { ...process.env, DATABASE_URL: `file:${dbPath}` };
const prismaCli = resolve(root, "node_modules/prisma/build/index.js");
const prisma = (...args) => execFileSync(process.execPath, [prismaCli, ...args], { stdio: "inherit", env });

// The db file was just removed above, so a plain push builds fresh tables —
// no --force-reset (which Prisma blocks as a destructive action) needed.
prisma("db", "push", "--schema", schema, "--skip-generate", "--accept-data-loss");

// Generate the sqlite client. On Windows a running dev server can hold the
// engine DLL (EPERM on rename); in that case the existing client is already
// the sqlite one, so warn and continue rather than fail the whole run.
try {
  prisma("generate", "--schema", schema);
} catch (err) {
  const clientExists = existsSync(resolve(root, "node_modules/.prisma/client/index.js"));
  if (!clientExists) throw err;
  console.warn(
    "\n[setup-test-db] prisma generate could not overwrite the client " +
      "(likely a running dev server locking the engine). Using the existing " +
      "generated client.\n",
  );
}

console.log(`Test database ready at ${dbPath}`);
