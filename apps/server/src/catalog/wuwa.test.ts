import { describe, expect, it } from "vitest";
import { catalogSchema, wuwa } from "@gacha/shared";

describe("wuwa catalog", () => {
  it("is schema-valid with real coverage", async () => {
    const catalog = catalogSchema.parse(await wuwa.loadCatalog!());
    expect(catalog.gameKey).toBe("wuwa");
    expect(catalog.source).toMatch(/^WutheringData@/);
    expect(catalog.characters.length).toBeGreaterThanOrEqual(40);
    expect(catalog.weapons.length).toBeGreaterThanOrEqual(90);
    expect(catalog.gear.length).toBeGreaterThanOrEqual(15);
    expect(catalog.materials.length).toBeGreaterThanOrEqual(40);
  });

  it("every cost references a catalog material", async () => {
    const catalog = catalogSchema.parse(await wuwa.loadCatalog!());
    const ids = new Set(catalog.materials.map((m) => m.id));
    const steps = [
      ...catalog.characters.flatMap((c) => [
        ...c.ascension,
        ...Object.values(c.talents.costsByKey ?? {}).flat(),
      ]),
      ...catalog.weapons.flatMap((w) => w.ascension),
    ];
    const unknown = steps.flatMap((s) => s.materials).filter((m) => !ids.has(m.materialId));
    expect(unknown).toEqual([]);
  });

  it("maps Chixia correctly and has unique keys", async () => {
    const catalog = catalogSchema.parse(await wuwa.loadCatalog!());
    const chixia = catalog.characters.find((c) => c.id === "1202");
    expect(chixia?.name).toBe("Chixia");
    expect(chixia?.tag).toBe("Fusion");
    expect(chixia?.weaponType).toBe("Pistols");
    expect(chixia?.rarity).toBe(4);
    expect(chixia?.maxLevel).toBe(90);
    expect(chixia?.ascension.at(-1)?.atLevel).toBe(90);
    expect(chixia?.talents.keys).toEqual(["basic", "skill", "forte", "liberation", "intro"]);
    for (const key of chixia!.talents.keys) {
      expect(chixia?.talents.costsByKey?.[key]?.at(-1)?.atLevel).toBe(10);
    }
    expect(catalog.gear.every((g) => g.slots.length === 5 && g.bonuses.length >= 1)).toBe(true);
    for (const list of [catalog.characters, catalog.weapons, catalog.gear, catalog.materials]) {
      expect(new Set(list.map((x) => x.key)).size).toBe(list.length);
    }
  });

  // Georges, round 6: a resonator's bonus stats (its forte tree's) highlighted; weapons filtered by their secondary stat.
  it("keeps each resonator's bonus stats and each weapon's secondary stat", async () => {
    const catalog = catalogSchema.parse(await wuwa.loadCatalog!());
    expect(catalog.characters.find((c) => c.name === "Chixia")?.bonusStats).toEqual(["Fusion DMG Bonus", "ATK"]);
    expect(new Set(catalog.weapons.map((w) => w.mainStat))).toEqual(new Set(["Crit. Rate", "Crit. DMG", "Energy Regen", "ATK", "DEF", "HP"]));
  });

  it("names each resonator's forte skills, which the sheet shows instead of the keys", async () => {
    const catalog = catalogSchema.parse(await wuwa.loadCatalog!());
    const chixia = catalog.characters.find((c) => c.id === "1202")!;
    expect(chixia.talents.info?.map((i) => [i.key, i.name])).toEqual([["basic", "POW POW"], ["skill", "Whizzing Fight Spirit"], ["forte", "Heroic Bullets"], ["liberation", "Blazing Flames"], ["intro", "Grand Entrance"]]);
  });

  // Georges, round 8: "Qiuyuan from WuWa is way too zoomed in": the art host names her card art with a capital (Qiuyuan) where the
  // game's path has none, so the icon stood in, enlarged; the importer keeps the name the host answers to.
  it("keeps each resonator's card art under the name the art host has: Qiuyuan's capitalised", async () => {
    const catalog = catalogSchema.parse(await wuwa.loadCatalog!());
    expect(catalog.characters.find((c) => c.name === "Qiuyuan")!.splash).toBe("T_IconRole_Pile_Qiuyuan_UI");
    expect(catalog.characters.find((c) => c.name === "Jiyan")!.splash).toBe("T_IconRole_Pile_jiyan_UI");
  });
});
