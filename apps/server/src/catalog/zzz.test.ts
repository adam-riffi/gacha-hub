import { describe, expect, it } from "vitest";
import { catalogSchema, zzz, zzzDocSchema } from "@gacha/shared";

describe("zzz catalog", () => {
  it("is schema-valid with real coverage, from the Hakushin data's live version", async () => {
    const catalog = catalogSchema.parse(await zzz.loadCatalog!());
    expect(catalog.gameKey).toBe("zzz");
    expect(catalog.source).toMatch(/^hakushin@static\.nanoka\.cc\/zzz\//);
    expect(catalog.characters.length).toBeGreaterThanOrEqual(50);
    expect(catalog.weapons.length).toBeGreaterThanOrEqual(80);
    expect(catalog.gear.length).toBeGreaterThanOrEqual(25);
    expect(catalog.materials.length).toBeGreaterThanOrEqual(20);
  });

  it("every cost references a catalog material", async () => {
    const catalog = catalogSchema.parse(await zzz.loadCatalog!());
    const ids = new Set(catalog.materials.map((m) => m.id));
    const steps = [
      ...catalog.characters.flatMap((c) => [...c.ascension, ...Object.values(c.talents.costsByKey ?? {}).flat()]),
      ...catalog.weapons.flatMap((w) => w.ascension),
    ];
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.flatMap((s) => s.materials).filter((m) => !ids.has(m.materialId))).toEqual([]);
  });

  it("maps Ellen: an S-rank Ice Attack agent, promotions to 60, five skills to 12, and her Mindscapes", async () => {
    const catalog = catalogSchema.parse(await zzz.loadCatalog!());
    const ellen = catalog.characters.find((c) => c.id === "1191")!;
    expect(ellen).toMatchObject({ name: "Ellen", rarity: 5, tag: "Ice", weaponType: "Attack", maxLevel: 60 });
    expect(ellen.ascension.map((s) => s.atLevel)).toEqual([20, 30, 40, 50, 60]);
    expect(ellen.talents.keys).toEqual(["basic", "dodge", "assist", "special", "chain"]);
    for (const k of ellen.talents.keys) expect(ellen.talents.costsByKey![k]!.at(-1)!.atLevel).toBe(12);
    expect(ellen.constellations).toHaveLength(6);
    // A W-Engine's five promotions open the caps 20 to 60; disc sets have six slots and two bonuses.
    expect(catalog.weapons.every((w) => w.ascension.at(-1)?.atLevel === 60)).toBe(true);
    expect(catalog.gear.every((g) => g.slots.length === 6 && g.bonuses.length === 2)).toBe(true);
    for (const list of [catalog.characters, catalog.weapons, catalog.gear, catalog.materials]) {
      expect(new Set(list.map((x) => x.key)).size).toBe(list.length);
    }
  });

  it("keeps every skill the catalog levels in the build doc", () => {
    expect(zzzDocSchema.parse({ skills: { basic: 3, dodge: 4, assist: 5, special: 6, chain: 7 } }).skills).toEqual({ basic: 3, dodge: 4, assist: 5, special: 6, chain: 7 });
  });
});
