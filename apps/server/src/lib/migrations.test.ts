import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Supabase exposes every public table through its REST API unless RLS is on
// (migration 20261004010000_enable_rls), so every table a migration creates
// must enable it.
const dir = new URL("../../../../prisma/migrations/", import.meta.url);
const sql = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => readFileSync(new URL(`${d.name}/migration.sql`, dir), "utf8"))
  .join("\n");

describe("migrations", () => {
  it("enable row-level security on every table they create", () => {
    const created = [...sql.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1]!);
    const secured = new Set([...sql.matchAll(/ALTER TABLE "(\w+)" ENABLE ROW LEVEL SECURITY/g)].map((m) => m[1]!));
    expect(created.length).toBeGreaterThan(10);
    expect(created.filter((t) => !secured.has(t))).toEqual([]);
  });
});
