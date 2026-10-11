import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { conformance, type GameDefinition } from "@gacha/shared";

// The scaffolder (ADR 0004 step 1) is a plain script; it is loaded by URL, outside this package.
type Scaffold = { files: Record<string, string>; edits: Record<string, (source: string) => string> };
const load = async (): Promise<{ scaffold: (key: string, name: string, today: string) => Scaffold }> =>
  import(/* @vite-ignore */ new URL("../../../../scripts/game-new.mjs", import.meta.url).href);
const root = new URL("../../../../", import.meta.url);

describe("npm run game:new", () => {
  // Every game shares the character page since the builds rework (2026-10-11): no web sheet to scaffold.
  it("scaffolds a module and a reference sheet, and registers the game", async () => {
    const { scaffold } = await load();
    const out = scaffold("testgame", "Test Game", "2026-10-10");
    expect(Object.keys(out.files).sort()).toEqual([
      "docs/games/testgame.md",
      "packages/shared/src/games/testgame/index.ts",
    ]);
    const registry = out.edits["packages/shared/src/games/index.ts"]!(readFileSync(new URL("packages/shared/src/games/index.ts", root), "utf8"));
    expect(registry).toContain('import { testgame } from "./testgame/index.js";');
    expect(registry).toContain("[testgame.key]: testgame,");
    expect(Object.keys(out.edits)).toEqual(["packages/shared/src/games/index.ts"]);
  });

  it("scaffolds a game that passes the conformance suite as it stands", async () => {
    const { scaffold } = await load();
    const out = scaffold("testgame", "Test Game", "2026-10-10");
    // The module imports its siblings by relative path, so it is tried where it would live.
    const dir = new URL("packages/shared/src/games/__scaffold-test__/", root);
    mkdirSync(dir, { recursive: true });
    try {
      const file = new URL("index.ts", dir);
      writeFileSync(file, out.files["packages/shared/src/games/testgame/index.ts"]!);
      const game = (await import(/* @vite-ignore */ file.href)).testgame as GameDefinition;
      expect(game.key).toBe("testgame");
      expect(conformance(game, out.files["docs/games/testgame.md"]!)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a malformed key", async () => {
    const { scaffold } = await load();
    for (const key of ["Test", "1game", "a", "with-dash", "x".repeat(17)]) expect(() => scaffold(key, "X", "2026-10-10")).toThrow(/key/);
  });
});
