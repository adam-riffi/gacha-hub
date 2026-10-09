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

  // Prisma 6's engine encrypted by default; pg does not, and reads sslmode=require as full
  // verification, which Supabase's own certificate authority fails. Keep Prisma 6's behaviour.
  it("encrypts a remote Postgres connection that names no sslmode, keeping its other parameters", () => {
    const url = "postgresql://user:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
    const db = resolveDatabase(url, prismaDir);
    expect(db.kind).toBe("postgres");
    const params = new URL(db.kind === "postgres" ? db.connectionString : "").searchParams;
    expect(params.get("pgbouncer")).toBe("true");
    expect(params.get("sslmode")).toBe("require");
    expect(params.get("uselibpqcompat")).toBe("true");
  });

  it("gives sslmode its libpq meaning when the URL names one", () => {
    const db = resolveDatabase("postgresql://u:p@db.example.com:5432/app?sslmode=require", prismaDir);
    const params = new URL(db.kind === "postgres" ? db.connectionString : "").searchParams;
    expect(params.get("sslmode")).toBe("require");
    expect(params.get("uselibpqcompat")).toBe("true");
  });

  it("leaves a local database (CI's service) unencrypted", () => {
    const url = "postgresql://postgres:postgres@localhost:5432/gacha";
    expect(resolveDatabase(url, prismaDir)).toEqual({ kind: "postgres", connectionString: url });
    expect(resolveDatabase("postgres://u@127.0.0.1/db", prismaDir)).toEqual({ kind: "postgres", connectionString: "postgres://u@127.0.0.1/db" });
  });

  it("refuses an empty URL with a clear message", () => {
    expect(() => resolveDatabase("", prismaDir)).toThrow(/DATABASE_URL/);
    expect(() => resolveDatabase(undefined, prismaDir)).toThrow(/DATABASE_URL/);
  });
});
