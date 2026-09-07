import { describe, expect, it } from "vitest";
import { migrateDoc } from "./docMigrations.js";

describe("migrateDoc", () => {
  const game = {
    docVersion: 3,
    migrations: {
      1: (d: unknown) => ({ ...(d as object), a: 1 }),
      2: (d: unknown) => ({ ...(d as object), b: 2 }),
    },
  };

  it("applies steps in order up to the current version", () => {
    const out = migrateDoc(game, { x: 0 }, 1);
    expect(out).toEqual({ doc: { x: 0, a: 1, b: 2 }, version: 3, changed: true });
  });

  it("is a no-op when already current", () => {
    const out = migrateDoc(game, { x: 0 }, 3);
    expect(out).toEqual({ doc: { x: 0 }, version: 3, changed: false });
  });

  it("stops at a missing step instead of overstating the version", () => {
    const gapped = { docVersion: 4, migrations: { 1: game.migrations[1] } };
    const out = migrateDoc(gapped, {}, 1);
    expect(out.version).toBe(2);
    expect(out.doc).toEqual({ a: 1 });
  });

  it("treats versions below 1 as 1", () => {
    expect(migrateDoc(game, {}, 0).version).toBe(3);
  });
});
