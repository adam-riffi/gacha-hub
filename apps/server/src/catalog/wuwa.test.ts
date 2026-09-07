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
});
