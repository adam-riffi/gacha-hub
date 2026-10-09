import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { resolveDatabase } from "./database.js";

// The client talks to the database through a driver adapter chosen by the URL
// (ADR 0003): better-sqlite3 locally, in tests and in the harnesses; pg
// through Supabase's pooler in production.
// The nearest prisma/ folder above the working directory, so a relative SQLite
// path means the same from the source, the bundle and the tests.
const prismaDir = (() => {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    if (existsSync(resolve(dir, "prisma/schema.prisma"))) return resolve(dir, "prisma");
    if (dirname(dir) === dir) return resolve(process.cwd(), "prisma");
  }
})();
const db = resolveDatabase(process.env.DATABASE_URL, prismaDir);
const adapter = db.kind === "sqlite" ? new PrismaBetterSqlite3({ url: db.path }) : new PrismaPg({ connectionString: db.connectionString });

// Single shared client. `globalThis` guard avoids exhausting connections when
// tsx watch reloads the module during development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
