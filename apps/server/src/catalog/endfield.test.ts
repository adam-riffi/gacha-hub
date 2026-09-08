import { describe, expect, it } from "vitest";
import { catalogSchema, endfield } from "@gacha/shared";

// Endfield's public data has no upgrade costs: the catalog is ownership-only.
describe("endfield catalog", () => {
  it("is schema-valid with characters only", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    expect(catalog.gameKey).toBe("endfield");
    expect(catalog.source).toMatch(/^EndFieldGameData/);
    expect(catalog.characters.length).toBeGreaterThanOrEqual(25);
    expect(catalog.weapons).toEqual([]);
    expect(catalog.materials).toEqual([]);
  });

  it("resolves names, professions and damage types; keys unique", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    // The protagonist has several entries (male/female + variants); the
    // importer gives each an id-suffixed key.
    const endmin = catalog.characters.filter((c) => c.name === "Endministrator");
    expect(endmin.length).toBeGreaterThanOrEqual(2);
    expect(new Set(endmin.map((c) => c.key)).size).toBe(endmin.length);
    expect(endmin[0]?.weaponType).toBe("Guard");
    expect(endmin[0]?.tag).toBe("Physical");
    for (const c of catalog.characters) {
      expect(c.rarity).toBeGreaterThanOrEqual(4);
      expect(c.extra?.costsAvailable).toBe(false);
    }
    expect(new Set(catalog.characters.map((c) => c.key)).size).toBe(catalog.characters.length);
  });
});
