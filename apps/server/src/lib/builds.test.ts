import { describe, expect, it } from "vitest";
import { buildKpis, gearSetLabel, getGame } from "@gacha/shared";

const genshin = getGame("genshin")!;
const wuwa = getGame("wuwa")!;

const piece = (setName: string, substats: [string, number][]) => ({ setName, substats: substats.map(([stat, value]) => ({ stat, value })) });

describe("buildKpis (WIREFRAMES.md G4)", () => {
  const doc = {
    stats: { "CRIT Rate": 68.2, "CRIT DMG": 199.4, "Energy Recharge": 112.3, "Elemental Mastery": 812 },
    artifacts: {
      flower: piece("Whimsy", [["CRIT Rate", 10.5], ["CRIT DMG", 21]]),
      plume: piece("Whimsy", [["CRIT DMG", 14], ["ATK%", 5]]),
      sands: piece("Whimsy", [["CRIT Rate", 3.5]]),
      goblet: piece("Whimsy", []),
      circlet: piece("Gladiator", [["CRIT DMG", 7]]),
    },
  };

  it("shows the three KPIs of the build's role, crit value from its gear's substats", () => {
    expect(buildKpis(genshin, doc, "damage")).toEqual([
      { label: "Crit value", value: "70" },
      { label: "CRIT Rate / CRIT DMG", value: "68 / 199" },
      { label: "Energy Recharge", value: "112%" },
    ]);
    expect(buildKpis(genshin, doc, "support").map((k) => k.value)).toEqual(["112%", "812", "—"]);
  });

  it("falls back to the game's first role, and reads each game's own stat names", () => {
    expect(buildKpis(genshin, doc, null).map((k) => k.label)).toEqual(["Crit value", "CRIT Rate / CRIT DMG", "Energy Recharge"]);
    const w = { stats: { "Crit. Rate": 55, "Crit. DMG": 210, "Energy Regen": 125 } };
    expect(buildKpis(wuwa, w, "damage").map((k) => k.value)).toEqual(["—", "55 / 210", "125%"]);
  });
});

describe("gearSetLabel", () => {
  it("names the set bonuses the gear completes", () => {
    const four = { artifacts: { a: piece("Whimsy", []), b: piece("Whimsy", []), c: piece("Whimsy", []), d: piece("Whimsy", []), e: piece("Gladiator", []) } };
    expect(gearSetLabel(genshin, four)).toBe("Whimsy 4pc");
    const twoTwo = { artifacts: { a: piece("Whimsy", []), b: piece("Whimsy", []), c: piece("Gladiator", []), d: piece("Gladiator", []) } };
    expect(gearSetLabel(genshin, twoTwo)).toBe("Gladiator 2pc + Whimsy 2pc");
    expect(gearSetLabel(genshin, { artifacts: {} })).toBeNull();
  });
});
