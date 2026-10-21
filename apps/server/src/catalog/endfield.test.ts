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
    // No cost data: its only items are its gifts (round 8).
    expect(catalog.materials.every((m) => m.category === "Gift")).toBe(true);
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
  // Round 17: icons by id from endfieldtools.dev, splash art by name from the Endfield wiki, gear sets still from Endaxis.
  it("has art: each operator's icon by id and splash by the wiki's file name, each weapon's icon by id, each gear set's from Endaxis", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    const perlica = catalog.characters.find((c) => c.key === "perlica")!;
    expect(perlica).toMatchObject({ icon: "chr_0004_pelica", splash: "Perlica" });
    expect(catalog.characters.find((c) => c.id === "chr_0005_chen")!.splash).toBe("Chen_Qianyu");
    expect(catalog.characters.filter((c) => c.icon).length).toBeGreaterThanOrEqual(28);
    expect(catalog.characters.filter((c) => c.splash).length).toBeGreaterThanOrEqual(25);
    expect(catalog.weapons.find((w) => w.id === "wpn_claym_0003")!.icon).toBe("wpn_claym_0003");
    expect(catalog.weapons.filter((w) => w.icon).length).toBeGreaterThanOrEqual(60);
    expect(catalog.gear.find((g) => g.id === "suit_agi01")!.icon).toMatch(/^equipment[/]agi01[/]/);
    expect(communityArtUrl("endfield", "character", perlica.icon)).toBe("https://endfieldtools.dev/assets/images/endfield/charremoteicon/icon_chr_0004_pelica.png");
    expect(communityArtUrl("endfield", "splash", perlica.splash)).toBe("https://endfield.wiki.gg/images/Perlica_Splash_Art.png");
  });

  // Georges, round 8: "for relevant games I want a gift/intimacy item list". Endfield's gifts suit operators by their hobbies.
  it("keeps each operator's hobbies and the gifts matching them, those matching both first", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    const perlica = catalog.characters.find((c) => c.key === "perlica")!;
    expect(perlica.extra?.hobbies).toEqual(["Lifestyle", "Creative"]);
    const gifts = perlica.gifts ?? [];
    expect(gifts.length).toBeGreaterThan(0);
    for (const g of gifts) expect(g.hobbies!.every((h) => ["Lifestyle", "Creative"].includes(h))).toBe(true);
    expect(gifts.map((g) => g.hobbies!.length)).toEqual([...gifts.map((g) => g.hobbies!.length)].sort((a, b) => b - a));
    const names = new Map(catalog.materials.map((m) => [m.id, m]));
    expect(names.get("item_gift_jinlong_1")).toMatchObject({ name: "Eureka Teabox", category: "Gift" });
    expect(gifts.find((g) => g.itemId === "item_gift_jinlong_1")?.hobbies).toEqual(["Lifestyle"]);
    // The Endministrator's hobbies are a secret: no gifts.
    expect(catalog.characters.find((c) => c.id === "chr_0002_endminm")!.gifts ?? []).toEqual([]);
  });
});
