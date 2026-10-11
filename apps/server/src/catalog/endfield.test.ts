import { describe, expect, it } from "vitest";
import { catalogSchema, endfield } from "@gacha/shared";

// Endfield's public tables have no upgrade costs: characters, weapons and gear sets, no materials.
// Georges, round 4: "try to populate Endfield and NTE for data on them".
describe("endfield catalog", () => {
  it("is schema-valid with characters, weapons and gear sets", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    expect(catalog.gameKey).toBe("endfield");
    expect(catalog.source).toMatch(/^EndFieldGameData/);
    expect(catalog.characters.length).toBeGreaterThanOrEqual(25);
    expect(catalog.weapons.length).toBeGreaterThanOrEqual(60);
    expect(new Set(catalog.weapons.map((w) => w.type))).toEqual(new Set(["Sword", "Greatsword", "Polearm", "Handcannon", "Arts Unit"]));
    expect(catalog.gear.length).toBeGreaterThanOrEqual(15);
    expect(catalog.gear.every((g) => g.slots.join() === "slot1,slot2,slot3,slot4" && g.name.length > 1)).toBe(true);
    expect(new Set(catalog.gear.map((g) => g.name)).size).toBe(catalog.gear.length);
    expect(catalog.materials).toEqual([]);
  });

  it("names a gear set from its body piece: Roving MSGR", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    expect(catalog.gear.map((g) => g.name)).toContain("Roving MSGR");
  });

  it("resolves names, professions and damage types; keys unique", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    // The protagonist has several entries (male/female + variants); the
    // importer gives each an id-suffixed key.
    const endmin = catalog.characters.filter((c) => c.name === "Endministrator");
    expect(endmin.length).toBeGreaterThanOrEqual(2);
    expect(new Set(endmin.map((c) => c.key)).size).toBe(endmin.length);
    // Its weapon kind, which the sheet's weapon picker filters by; the profession seeds the build's class.
    expect(endmin[0]?.weaponType).toBe("Sword");
    expect(endmin[0]?.extra?.profession).toBe("Guard");
    expect(endfield.seedDoc!(endmin[0]!)).toMatchObject({ class: "Guard" });
    expect(endmin[0]?.tag).toBe("Physical");
    for (const c of catalog.characters) {
      expect(c.rarity).toBeGreaterThanOrEqual(4);
      expect(c.extra?.costsAvailable).toBe(false);
    }
    expect(new Set(catalog.characters.map((c) => c.key)).size).toBe(catalog.characters.length);
  });
});
