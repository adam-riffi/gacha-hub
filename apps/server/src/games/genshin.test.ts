import { describe, expect, it } from "vitest";
import { projectRegen } from "./genshin.js";
import { allGameBotCommands, gameServerModules } from "./index.js";

const H = 3_600_000;
const now = new Date("2026-09-07T12:00:00Z");

describe("projectRegen", () => {
  it("adds regen since the snapshot, clamped to cap", () => {
    const p = projectRegen(100, 200, 7.5, new Date(now.getTime() - 4 * H), now);
    expect(p.value).toBe(130); // 100 + 7.5*4
    expect(p.full).toBe(false);
    // 70 remaining / 7.5 per hour ≈ 9h20m from now.
    expect(p.fullAt).toBe(new Date(now.getTime() + (70 / 7.5) * H).toISOString());
  });

  it("caps at the maximum and reports full", () => {
    const p = projectRegen(100, 200, 7.5, new Date(now.getTime() - 20 * H), now);
    expect(p.value).toBe(200);
    expect(p.full).toBe(true);
    expect(p.fullAt).toBeNull();
  });

  it("already full stays full", () => {
    expect(projectRegen(200, 200, 7.5, now, now)).toMatchObject({ value: 200, full: true, fullAt: null });
  });

  it("never regenerates backwards for a future snapshot", () => {
    const p = projectRegen(50, 200, 7.5, new Date(now.getTime() + 5 * H), now);
    expect(p.value).toBe(50);
  });
});

describe("game server module registry", () => {
  it("registers Genshin and exposes its /resin command", () => {
    expect(gameServerModules.genshin?.key).toBe("genshin");
    expect(allGameBotCommands().map((c) => c.name)).toContain("resin");
  });
});
