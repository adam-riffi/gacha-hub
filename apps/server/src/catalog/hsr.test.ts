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

  it("keeps names as plain text (the source sometimes wraps them in markup)", async () => {
    const catalog = catalogSchema.parse(await hsr.loadCatalog!());
    const marked = [catalog.characters, catalog.weapons, catalog.gear, catalog.materials].flat().filter((x) => /[<>]/.test(x.name));
    expect(marked.map((x) => x.name)).toEqual([]);
  });

  it("covers version 4.6 (featured on the current Event Warp)", async () => {
    const catalog = catalogSchema.parse(await hsr.loadCatalog!());
    expect(catalog.characters.map((c) => c.name)).toContain("Pearl");
    expect(catalog.weapons.map((w) => w.name)).toContain("Colors for Tomorrow");
  });

  it("carries the relic stat tables Enka's showcase needs: each piece's slot, set and stat groups, and the groups' values", async () => {
    const cat = catalogSchema.parse(await hsr.loadCatalog!());
    const stats = cat.relicStats!;
    // A 2★ Passerby of Wandering Cloud head: set 101, main group 21 (flat HP), substat group 2.
    expect(stats.pieces["31011"]).toEqual({ slot: "head", set: "101", main: "21", sub: "2" });
    expect(new Set(Object.values(stats.pieces).map((p) => p.slot))).toEqual(new Set(["head", "hands", "body", "feet", "sphere", "rope"]));
    expect(stats.main["21"]!["1"]).toEqual({ stat: "HPDelta", base: expect.any(Number), add: expect.any(Number) });
    expect(stats.sub["2"]!["1"]).toEqual({ stat: "HPDelta", base: expect.any(Number), step: expect.any(Number) });
    // Every piece's set is one of the catalog's relic sets.
    const sets = new Set(cat.gear.map((g) => g.id));
    expect(Object.values(stats.pieces).every((p) => sets.has(p.set))).toBe(true);
  });
});
