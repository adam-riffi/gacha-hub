import { describe, expect, it } from "vitest";
import { catalogSchema, communityArtUrl, endfield } from "@gacha/shared";

// Endfield's public data has no upgrade costs: characters, weapons and gear sets, no materials.
// Georges, round 4: "try to populate Endfield and NTE for data on them". Round 20: EndFieldGameData stopped at v0.3.0 (June
// 2026) and its newest release carries no tables, so the catalog reads the Endfield wiki's data tables (Cargo: Operators,
// Weapons, Gears, GearStats, GearSets, Items, Gifts), which carry the game's own ids.
describe("endfield catalog", () => {
  it("is schema-valid with characters, weapons and gear sets from the wiki's tables", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    expect(catalog.gameKey).toBe("endfield");
    expect(catalog.source).toMatch(/^endfield\.wiki\.gg/);
    expect(catalog.characters.length).toBeGreaterThanOrEqual(35);
    // The 1.4 and 1.5 operators Game8's banners name (round 18 left them out of the feed's featured units).
    expect(catalog.characters.map((c) => c.name)).toEqual(expect.arrayContaining(["Si", "Typhoeus", "Liino", "Argent Flow", "Tangtang"]));
    expect(catalog.characters.find((c) => c.name === "Si")).toMatchObject({ id: "chr_0036_jsspsi", rarity: 6, tag: "Cryo", weaponType: "Greatsword", extra: { profession: "Supporter" } });
    expect(catalog.weapons.length).toBeGreaterThanOrEqual(80);
    expect(new Set(catalog.weapons.map((w) => w.type))).toEqual(new Set(["Sword", "Greatsword", "Polearm", "Handcannon", "Arts Unit"]));
    expect(catalog.gear.length).toBeGreaterThanOrEqual(25);
    expect(catalog.gear.every((g) => g.slots.join() === "slot1,slot2,slot3,slot4" && g.name.length > 1)).toBe(true);
    expect(new Set(catalog.gear.map((g) => g.name)).size).toBe(catalog.gear.length);
    // No cost data: its only items are its gifts (round 8).
    expect(catalog.materials.every((m) => m.category === "Gift")).toBe(true);
  });

  it("names each gear set as the game does (Roving MSGR, Aburrey's Legacy) and lists its pieces", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    expect(catalog.gear.map((g) => g.name)).toEqual(expect.arrayContaining(["Roving MSGR", "Aburrey's Legacy", "Type 50 Yinglung"]));
    const aburrey = catalog.gear.find((g) => g.name === "Aburrey's Legacy")!;
    expect(aburrey.id).toBe("suit_atk01");
    expect(aburrey.extra?.pieces).toEqual(expect.arrayContaining(["item_equip_t3_suit_atk01_body_01"]));
    expect(aburrey.bonuses[0]).toMatch(/^3pc: Wearer's Skill DMG \+24%/);
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
  // Round 17: icons by id from endfieldtools.dev, splash art by name from the Endfield wiki. Round 20: a gear set's picture is
  // its armour piece's on the wiki (Endaxis, pinned to a commit, stopped at the first sets).
  it("has art: each operator's icon by id and splash by the wiki's file name, each weapon's icon by id, each gear set's armour from the wiki", async () => {
    const catalog = catalogSchema.parse(await endfield.loadCatalog!());
    const perlica = catalog.characters.find((c) => c.key === "perlica")!;
    expect(perlica).toMatchObject({ icon: "chr_0004_pelica", splash: "Perlica" });
    expect(catalog.characters.find((c) => c.id === "chr_0005_chen")!.splash).toBe("Chen_Qianyu");
    expect(catalog.characters.filter((c) => c.icon).length).toBeGreaterThanOrEqual(33);
    expect(catalog.characters.filter((c) => c.splash).length).toBeGreaterThanOrEqual(30);
    expect(catalog.weapons.find((w) => w.id === "wpn_claym_0003")!.icon).toBe("wpn_claym_0003");
    expect(catalog.weapons.filter((w) => w.icon).length).toBeGreaterThanOrEqual(75);
    const aburrey = catalog.gear.find((g) => g.id === "suit_atk01")!;
    expect(aburrey.icon).toBe("Aburrey_Heavy_Armor.png");
    expect(catalog.gear.filter((g) => g.icon).length).toBeGreaterThanOrEqual(25);
    expect(communityArtUrl("endfield", "character", perlica.icon)).toBe("https://endfieldtools.dev/assets/images/endfield/charremoteicon/icon_chr_0004_pelica.png");
    expect(communityArtUrl("endfield", "splash", perlica.splash)).toBe("https://endfield.wiki.gg/images/Perlica_Splash_Art.png");
    expect(communityArtUrl("endfield", "gear", aburrey.icon)).toBe("https://endfield.wiki.gg/images/Aburrey_Heavy_Armor.png");
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
