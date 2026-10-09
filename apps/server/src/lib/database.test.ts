import { describe, expect, it } from "vitest";
import { resolveDatabase } from "./database.js";

// Prisma 7 talks to the database through a driver adapter chosen by the URL
// (ADR 0003): SQLite for file: URLs, Postgres otherwise. Relative SQLite paths
// keep their Prisma 6 meaning, relative to the prisma/ folder.
describe("resolveDatabase", () => {
  const prismaDir = "C:/repo/prisma";

  it("resolves a relative SQLite path against the prisma folder", () => {
    expect(resolveDatabase("file:./dev.db", prismaDir)).toEqual({ kind: "sqlite", path: "C:/repo/prisma/dev.db" });
    expect(resolveDatabase("file:test.db", prismaDir)).toEqual({ kind: "sqlite", path: "C:/repo/prisma/test.db" });
  });

  it("keeps an absolute SQLite path", () => {
    expect(resolveDatabase("file:C:/elsewhere/e2e.db", prismaDir)).toEqual({ kind: "sqlite", path: "C:/elsewhere/e2e.db" });
    expect(resolveDatabase("file:/var/data/app.db", "/srv/prisma")).toEqual({ kind: "sqlite", path: "/var/data/app.db" });
  });

  it("passes a Postgres URL through untouched", () => {
    const url = "postgresql://user:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
    expect(resolveDatabase(url, prismaDir)).toEqual({ kind: "postgres", connectionString: url });
    expect(resolveDatabase("postgres://u@h/db", prismaDir).kind).toBe("postgres");
  });

  it("refuses an empty URL with a clear message", () => {
    expect(() => resolveDatabase("", prismaDir)).toThrow(/DATABASE_URL/);
    expect(() => resolveDatabase(undefined, prismaDir)).toThrow(/DATABASE_URL/);
  });
});
