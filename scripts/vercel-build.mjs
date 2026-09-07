// Vercel build: generate the Prisma client (with the serverless engine),
// optionally apply migrations, build the static web app, and bundle the API
// function. Run by `npm run vercel-build` (see vercel.json).
import { execSync } from "node:child_process";

const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

run("npx prisma generate --schema prisma/schema.prisma");

// Migrations need a direct (non-pooled) connection. Only run when configured
// so preview builds without a database still succeed.
if (process.env.DIRECT_DATABASE_URL && process.env.RUN_MIGRATIONS !== "false") {
  run("npx prisma migrate deploy --schema prisma/schema.prisma");
} else {
  console.log("\n(skipping migrations: DIRECT_DATABASE_URL not set)");
}

run("npm run build -w @gacha/web");
run("node scripts/build-server-bundle.mjs");
