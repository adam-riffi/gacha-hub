import { describe, expect, it } from "vitest";
import { catalogSchema, genshin } from "@gacha/shared";

// Guards the committed catalog: schema-valid, real coverage, internally
// consistent (every cost references a known material), and sane caps.
describe("genshin catalog", () => {
  it("is schema-valid with real coverage", async () => {
    const catalog = catalogSchema.parse(await genshin.loadCatalog!());
    expect(catalog.gameKey).toBe("genshin");
    expect(catalog.source).toMatch(/^genshin-db@/);
    expect(catalog.characters.length).toBeGreaterThanOrEqual(90);
    expect(catalog.weapons.length).toBeGreaterThanOrEqual(150);
    expect(catalog.gear.length).toBeGreaterThanOrEqual(40);
    expect(catalog.materials.length).toBeGreaterThanOrEqual(200);
  });

  it("every cost references a catalog material", async () => {
    const catalog = catalogSchema.parse(await genshin.loadCatalog!());
    const ids = new Set(catalog.materials.map((m) => m.id));
    const steps = [
      ...catalog.characters.flatMap((c) => [...c.ascension, ...c.talents.costs]),
      ...catalog.weapons.flatMap((w) => w.ascension),
    ];
    const unknown = steps.flatMap((s) => s.materials).filter((m) => !ids.has(m.materialId));
    expect(unknown).toEqual([]);
  });

  it("has sane caps and unique keys", async () => {
    const catalog = catalogSchema.parse(await genshin.loadCatalog!());
    const amber = catalog.characters.find((c) => c.key === "amber");
    expect(amber?.maxLevel).toBe(90);
    expect(amber?.ascension.at(-1)?.atLevel).toBe(90);
    expect(amber?.talents.costs.at(-1)?.atLevel).toBe(10);
    expect(amber?.talents.keys).toEqual(["normal", "skill", "burst"]);
    for (const list of [catalog.characters, catalog.weapons, catalog.gear, catalog.materials]) {
      expect(new Set(list.map((x) => x.key)).size).toBe(list.length);
    }
    const books = catalog.materials.filter((m) => m.availability?.length);
    expect(books.length).toBeGreaterThan(0);
  });

  // Georges, round 6: "the character's ascension stat should be highlighted; filter weapons by main stat; add the talent icon; a misc part for non-upgradable talents".
  it("keeps each character's ascension stat, talent icons and passives, and each weapon's main stat", async () => {
    const catalog = catalogSchema.parse(await genshin.loadCatalog!());
    const ayaka = catalog.characters.find((c) => c.name === "Kamisato Ayaka")!;
    expect(ayaka.bonusStats).toEqual(["CRIT DMG"]);
    expect(ayaka.talents.info?.map((i) => i.icon)).toEqual(["Skill_A_01", "Skill_S_Ayaka_01", "Skill_E_Ayaka_HD"]);
    expect(ayaka.passives?.length).toBeGreaterThanOrEqual(3);
    expect(ayaka.passives?.[0]).toMatchObject({ name: expect.any(String), description: expect.any(String), icon: expect.stringMatching(/^UI_Talent_/) });
    expect(catalog.weapons.find((w) => w.name === "Mistsplitter Reforged")?.mainStat).toBe("CRIT DMG");
    expect(catalog.characters.filter((c) => c.bonusStats?.length).length).toBeGreaterThanOrEqual(100);
  });

  it("names each character's talents, which the sheet shows instead of Normal, Skill and Burst", async () => {
    const catalog = catalogSchema.parse(await genshin.loadCatalog!());
    const amber = catalog.characters.find((c) => c.name === "Amber")!;
    expect(amber.talents.info?.map((i) => [i.key, i.name])).toEqual([["normal", "Sharpshooter"], ["skill", "Explosive Puppet"], ["burst", "Fiery Rain"]]);
    // The Traveler's talents change with the element, so genshin-db names none under Aether or Lumine.
    expect(catalog.characters.filter((c) => c.talents.keys.length && !c.talents.info?.length).map((c) => c.name)).toEqual(["Aether", "Lumine"]);
  });

  it("keeps each character's skill order (normal, skill, burst ids) from Enka's store, to read showcase talent levels", async () => {
    const catalog = catalogSchema.parse(await genshin.loadCatalog!());
    expect(catalog.characters.find((c) => c.name === "Amber")!.extra?.skillOrder).toEqual(["10041", "10032", "10017"]);
  });
});
