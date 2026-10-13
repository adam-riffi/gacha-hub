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
      ...catalog.characters.flatMap((c) => [
        ...c.ascension,
        ...Object.values(c.talents.costsByKey ?? {}).flat(),
      ]),
      ...catalog.weapons.flatMap((w) => w.ascension),
    ];
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.flatMap((s) => s.materials).filter((m) => !ids.has(m.materialId))).toEqual([]);
  });

  it("maps Ellen: an S-rank Ice Attack agent, promotions to 60, five skills to 12, the core skill to 7, and her Mindscapes", async () => {
    const catalog = catalogSchema.parse(await zzz.loadCatalog!());
    const ellen = catalog.characters.find((c) => c.id === "1191")!;
    expect(ellen).toMatchObject({
      name: "Ellen",
      rarity: 5,
      tag: "Ice",
      weaponType: "Attack",
      maxLevel: 60,
    });
    expect(ellen.ascension.map((s) => s.atLevel)).toEqual([20, 30, 40, 50, 60]);
    expect(ellen.talents.keys).toEqual(["basic", "dodge", "assist", "special", "chain", "core"]);
    for (const k of ellen.talents.keys.filter((k) => k !== "core"))
      expect(ellen.talents.costsByKey![k]!.at(-1)!.atLevel).toBe(12);
    // The core skill: its base level, then the six enhancements A to F.
    expect(ellen.talents.costsByKey!.core!.map((s) => s.atLevel)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(ellen.constellations).toHaveLength(6);
    // A W-Engine's five promotions open the caps 20 to 60; disc sets have six slots and two bonuses.
    expect(catalog.weapons.every((w) => w.ascension.at(-1)?.atLevel === 60)).toBe(true);
    expect(catalog.gear.every((g) => g.slots.length === 6 && g.bonuses.length === 2)).toBe(true);
    for (const list of [catalog.characters, catalog.weapons, catalog.gear, catalog.materials]) {
      expect(new Set(list.map((x) => x.key)).size).toBe(list.length);
    }
  });

  // Georges, round 6: an agent's growth stat (its core skill's) highlighted; W-Engines filtered by their advanced stat.
  it("keeps each agent's core stat and each W-Engine's advanced stat", async () => {
    const catalog = catalogSchema.parse(await zzz.loadCatalog!());
    expect(catalog.characters.find((c) => c.name === "Ellen")?.bonusStats).toEqual(["CRIT Rate"]);
    expect(catalog.weapons.find((w) => w.name === "Steel Cushion")?.mainStat).toBe("CRIT Rate");
    expect(catalog.weapons.filter((w) => w.mainStat).length).toBe(catalog.weapons.length);
  });

  // Georges, round 6: "add Bangboos to ZZZ".
  it("lists the Bangboos as the game's companions, with their art", async () => {
    const catalog = catalogSchema.parse(await zzz.loadCatalog!());
    expect(catalog.companions?.length).toBeGreaterThanOrEqual(40);
    expect(catalog.companions?.find((b) => b.name === "Penguinboo")).toMatchObject({ id: "53001", icon: "BangbooGarageRole12" });
    expect(new Set(catalog.companions?.map((b) => b.rarity))).toEqual(new Set([4, 5]));
  });

  it("keeps every skill the catalog levels in the build doc", () => {
    expect(
      zzzDocSchema.parse({
        skills: { basic: 3, dodge: 4, assist: 5, special: 6, chain: 7, core: 7 },
      }).skills,
    ).toEqual({ basic: 3, dodge: 4, assist: 5, special: 6, chain: 7, core: 7 });
  });
});
