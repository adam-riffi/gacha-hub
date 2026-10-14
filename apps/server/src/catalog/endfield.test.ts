import { describe, expect, it } from "vitest";
import { catalogSchema, communityArtUrl, endfield } from "@gacha/shared";

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

  // Georges, round 7: "add the weapons tracking and character art and everything else related to Endfield": the art from
  // the Endaxis timeline tool's public folders, each key one the repository holds (its tree read by the importer).
  it("has art: each operator's avatar and portrait, each weapon's and gear set's icon, from Endaxis", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    const perlica = catalog.characters.find((c) => c.key === "perlica")!;
    expect(perlica).toMatchObject({ icon: "operators/perlica/avatar", splash: "operators/perlica/portrait" });
    expect(catalog.characters.find((c) => c.id === "chr_0003_endminf")!.icon).toBe("operators/endministrator/avatar");
    expect(catalog.characters.filter((c) => c.icon).length).toBeGreaterThanOrEqual(28);
    expect(catalog.weapons.find((w) => w.id === "wpn_claym_0003")!.icon).toBe("weapons/claym/wpn_claym_0003");
    expect(catalog.weapons.filter((w) => w.icon).length).toBeGreaterThanOrEqual(60);
    expect(catalog.gear.find((g) => g.id === "suit_agi01")!.icon).toMatch(/^equipment\/agi01\//);
    expect(communityArtUrl("endfield", "character", perlica.icon)).toMatch(/^https:\/\/raw\.githubusercontent\.com\/Lieyuan621\/Endaxis\/[0-9a-f]{40}\/public\/operators%2Fperlica%2Favatar\.webp$/);
  });
});
