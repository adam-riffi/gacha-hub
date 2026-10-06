import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

// SPIKE (Prisma 7): the client talks to the database through a driver adapter.
// SQLite paths were relative to prisma/ under Prisma 6; keep that meaning.
const url = process.env.DATABASE_URL ?? "";
// The nearest prisma/ folder above the working directory (source, bundle and tests alike).
const prismaDir = (() => {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    if (existsSync(resolve(dir, "prisma/schema.prisma"))) return resolve(dir, "prisma");
    if (dirname(dir) === dir) return process.cwd();
  }
})();
const sqlitePath = (u: string) => {
  const p = u.slice("file:".length);
  return isAbsolute(p) ? p : resolve(prismaDir, p);
};
const adapter = url.startsWith("file:") ? new PrismaBetterSqlite3({ url: sqlitePath(url) }) : new PrismaPg({ connectionString: url });

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
