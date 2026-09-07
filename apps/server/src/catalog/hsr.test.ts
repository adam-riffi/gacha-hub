import { describe, expect, it } from "vitest";
import { catalogSchema, hsr } from "@gacha/shared";

describe("hsr catalog", () => {
  it("is schema-valid with real coverage", async () => {
    const catalog = catalogSchema.parse(await hsr.loadCatalog!());
    expect(catalog.gameKey).toBe("hsr");
    expect(catalog.source).toMatch(/^yatta/);
    expect(catalog.characters.length).toBeGreaterThanOrEqual(80);
    expect(catalog.weapons.length).toBeGreaterThanOrEqual(120);
    expect(catalog.gear.length).toBeGreaterThanOrEqual(50);
    expect(catalog.materials.length).toBeGreaterThanOrEqual(80);
  });

  it("every cost references a catalog material", async () => {
    const catalog = catalogSchema.parse(await hsr.loadCatalog!());
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

  it("has sane caps, per-trace costs, and unique keys", async () => {
    const catalog = catalogSchema.parse(await hsr.loadCatalog!());
    // Two characters share the display name "March 7th" (1001 Ice, 1224
    // Imaginary), so their keys are id-suffixed; look up by id.
    const march = catalog.characters.find((c) => c.id === "1001");
    expect(march?.name).toBe("March 7th");
    expect(march?.maxLevel).toBe(80);
    expect(march?.ascension.at(-1)?.atLevel).toBe(80);
    expect(march?.talents.keys).toEqual(["basic", "skill", "ultimate", "talent"]);
    expect(march?.talents.costsByKey?.basic?.at(-1)?.atLevel).toBe(6);
    expect(march?.talents.costsByKey?.skill?.at(-1)?.atLevel).toBe(10);
    const planar = catalog.gear.find((g) => g.slots.includes("sphere"));
    expect(planar?.slots).toEqual(["sphere", "rope"]);
    for (const list of [catalog.characters, catalog.weapons, catalog.gear, catalog.materials]) {
      expect(new Set(list.map((x) => x.key)).size).toBe(list.length);
    }
  });
});
