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
  if (!url.startsWith("file:")) return { kind: "postgres", connectionString: withTls(url) };
  const path = url.slice("file:".length);
  if (ABSOLUTE.test(path)) return { kind: "sqlite", path: path };
  const dir = prismaDir.replace(/\\/g, "/").replace(/\/$/, "");
  return { kind: "sqlite", path: `${dir}/${path.replace(/^\.\//, "")}` };
}

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Keep Prisma 6's TLS behaviour on the pg driver. A remote server without an
 * sslmode is encrypted without verification (Prisma 6's engine encrypted by
 * default; Supabase signs its certificates with its own authority, which Node
 * does not trust). An sslmode the URL names keeps its libpq meaning, which pg
 * only applies with uselibpqcompat. A local server (CI's) stays as written.
 */
function withTls(url: string): string {
  const parsedUrl = new URL(url);
  if (LOCAL.has(parsedUrl.hostname)) return url;
  if (!parsedUrl.searchParams.has("sslmode")) parsedUrl.searchParams.set("sslmode", "require");
  if (!parsedUrl.searchParams.has("uselibpqcompat")) parsedUrl.searchParams.set("uselibpqcompat", "true");
  return parsedUrl.toString();
}
