import { describe, expect, it } from "vitest";
import { ascensionPips, gearPieceCv, getGame, offSetSlots, skillsField, weaponHolder } from "@gacha/shared";

const g = (key: string) => getGame(key)!;
const piece = (setName: string, substats: [string, number][] = []) => ({ setName, substats: substats.map(([stat, value]) => ({ stat, value })) });

describe("the character sheet's reading of each game (WIREFRAMES.md G5)", () => {
  it("finds where each game keeps skill levels and the weapon", () => {
    expect([skillsField(g("genshin")), skillsField(g("hsr")), skillsField(g("wuwa"))]).toEqual(["talents", "traces", "skills"]);
    expect([weaponHolder(g("genshin")), weaponHolder(g("hsr")), weaponHolder(g("zzz")), weaponHolder(g("nte")), weaponHolder(g("endfield"))]).toEqual(["weapon", "lightCone", "wEngine", "arc", null]);
  });

  it("fills an ascension pip for each phase below the level", () => {
    expect([ascensionPips(1), ascensionPips(45), ascensionPips(80), ascensionPips(90)]).toEqual([0, 2, 5, 6]);
  });

  it("reads a piece's crit value from its substats", () => {
    expect(gearPieceCv(piece("Whimsy", [["CRIT Rate", 10.5], ["CRIT DMG", 21], ["ATK%", 5]]))).toBe(42);
    expect(gearPieceCv(piece("Whimsy", [["Crit. Rate", 3]]))).toBe(6);
    expect(gearPieceCv({})).toBe(0);
  });

  it("flags the pieces outside the set the rest complete, as ones to farm", () => {
    const doc = { artifacts: { flower: piece("Whimsy"), plume: piece("Whimsy"), sands: piece("Whimsy"), goblet: piece("Whimsy"), circlet: piece("Gladiator") } };
    expect(offSetSlots(g("genshin"), doc)).toEqual(["circlet"]);
    expect(offSetSlots(g("genshin"), { artifacts: {} })).toEqual([]);
  });
});
