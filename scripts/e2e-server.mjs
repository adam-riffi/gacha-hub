// Playwright's web server: a fresh SQLite database, the Prisma client for it,
// and the always-on server (which serves apps/web/dist when it is built) with
// the dev login enabled. Run `npm run build -w @gacha/web` first.
import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The dev user is an admin here so journeys can upload banners and events.
// Absolute: Prisma's CLI and client resolve relative SQLite paths differently.
const env = { ...process.env, DATABASE_URL: `file:${resolve(root, "prisma/e2e.db").replace(/\\/g, "/")}`, DEV_LOGIN_ENABLED: "true", ADMIN_DISCORD_IDS: "dev-local-user", PORT: process.env.PORT ?? "3100" };

// The owner password of the sign-in journey (ADR 0010), hashed as `npm run password:hash` does.
env.OWNER_PASSWORD_HASH = execFileSync(process.execPath, [resolve(root, "node_modules/tsx/dist/cli.mjs"), "apps/server/src/auth/hashPassword.ts"], { cwd: root, input: "e2e-owner-password\n" })
  .toString()
  .trim()
  .replace(/^OWNER_PASSWORD_HASH=/, "");

for (const suffix of ["", "-journal"]) rmSync(resolve(root, `prisma/e2e.db${suffix}`), { force: true });
execFileSync(process.execPath, [resolve(root, "scripts/gen-sqlite-schema.mjs")], { stdio: "inherit" });
// CLIs run through node directly: no shell, the same on every OS.
const bin = (path) => resolve(root, "node_modules", path);
// A fresh file, so no --accept-data-loss. Prisma 7's push does not generate the client: do it after.
for (const args of [["db", "push"], ["generate"]]) {
  execFileSync(process.execPath, [bin("prisma/build/index.js"), ...args, "--schema", "prisma/schema.sqlite.prisma"], { cwd: root, env, stdio: "inherit" });
}

const server = spawn(process.execPath, [bin("tsx/dist/cli.mjs"), "src/index.ts"], {
  cwd: resolve(root, "apps/server"),
  env,
  stdio: "inherit",
});
server.on("exit", (code) => process.exit(code ?? 0));
