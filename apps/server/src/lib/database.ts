export type Database = { kind: "sqlite"; path: string } | { kind: "postgres"; connectionString: string };

const ABSOLUTE = /^(?:[A-Za-z]:[\\/]|\/)/;

/**
 * Where the client connects, from DATABASE_URL (ADR 0003): SQLite for a
 * `file:` URL, Postgres otherwise. A relative SQLite path keeps its Prisma 6
 * meaning, relative to the prisma/ folder, so `file:./dev.db` still points at
 * prisma/dev.db from any working directory. Pure, so the choice is testable.
 */
export function resolveDatabase(url: string | undefined, prismaDir: string): Database {
  if (!url) throw new Error("DATABASE_URL is not set: give a file: URL for SQLite or a postgres:// URL.");
  if (!url.startsWith("file:")) return { kind: "postgres", connectionString: url };
  const p = url.slice("file:".length);
  if (ABSOLUTE.test(p)) return { kind: "sqlite", path: p };
  const dir = prismaDir.replace(/\\/g, "/").replace(/\/$/, "");
  return { kind: "sqlite", path: `${dir}/${p.replace(/^\.\//, "")}` };
}
