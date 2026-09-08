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
});
