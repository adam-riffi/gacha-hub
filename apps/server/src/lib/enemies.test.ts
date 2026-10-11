import { describe, expect, it } from "vitest";
import { enemiesFor, endgameEnemiesSchema, getGame, type EndgameEnemies } from "@gacha/shared";

const stage = (name: string) => ({ name, groups: [[{ name: `${name} boss`, weak: [] }]], weak: ["Ice"] });
const data: EndgameEnemies = {
  source: "test",
  cycles: [
    { modeKey: "shiyu", begin: "2026-09-18", end: "2026-10-01", stages: [stage("Old")] },
    { modeKey: "shiyu", begin: "2026-10-02", end: "2026-10-15", stages: [stage("Now")] },
    { modeKey: "assault", begin: "2026-10-09", end: "2026-10-22", stages: [stage("Boss")] },
  ],
};

// Who each endgame cycle sends at you (Georges, 2026-10-11: "what enemies are on what level").
describe("enemiesFor", () => {
  it("gives the cycle running on the server's day", () => {
    expect(enemiesFor(data, "shiyu", "2026-10-11")).toMatchObject({ begin: "2026-10-02", current: true, stages: [{ name: "Now" }] });
  });

  it("falls back to the latest cycle that began, marked as not current, and to none before the first", () => {
    expect(enemiesFor(data, "shiyu", "2026-10-20")).toMatchObject({ begin: "2026-10-02", current: false });
    expect(enemiesFor(data, "shiyu", "2026-09-01")).toBeNull();
    expect(enemiesFor(data, "abyss", "2026-10-11")).toBeNull();
  });

  it("ships Zenless Zone Zero's Shiyu Defense and Deadly Assault cycles from the importer", async () => {
    const zzz = await getGame("zzz")!.loadEndgame!();
    expect(endgameEnemiesSchema.parse(zzz).cycles.map((c) => c.modeKey)).toEqual(expect.arrayContaining(["shiyu", "assault"]));
    expect(zzz.cycles.every((c) => c.stages.length > 0 && c.stages.every((s) => s.groups.flat().length > 0))).toBe(true);
  });
});
