import { describe, expect, it } from "vitest";
import {
  catalogSchema,
  characterRequirements,
  deficit,
  genshin,
  hsr,
  levelCaps,
  mergeReqs,
  stepsBetween,
  sumSteps,
  talentMax,
  weaponRequirements,
  type CostStep,
} from "@gacha/shared";

const steps: CostStep[] = [
  { atLevel: 40, materials: [{ materialId: "a", qty: 1 }] },
  { atLevel: 50, materials: [{ materialId: "a", qty: 2 }, { materialId: "b", qty: 1 }] },
  { atLevel: 60, materials: [{ materialId: "b", qty: 3 }] },
];

describe("planning math", () => {
  it("selects steps by cap range (from, to]", () => {
    expect(stepsBetween(steps, { from: 20, to: 50 }).map((s) => s.atLevel)).toEqual([40, 50]);
    expect(stepsBetween(steps, { from: 40, to: 60 }).map((s) => s.atLevel)).toEqual([50, 60]);
    expect(stepsBetween(steps, { from: 60, to: 90 })).toEqual([]);
  });

  it("aggregates materials", () => {
    expect(sumSteps(stepsBetween(steps, { from: 20, to: 60 }))).toEqual([
      { materialId: "a", qty: 3 },
      { materialId: "b", qty: 4 },
    ]);
    expect(mergeReqs([{ materialId: "x", qty: 1 }], [{ materialId: "x", qty: 2 }, { materialId: "y", qty: 0 }])).toEqual([
      { materialId: "x", qty: 3 },
    ]);
  });

  it("subtracts stock and drops satisfied rows", () => {
    expect(deficit([{ materialId: "a", qty: 3 }, { materialId: "b", qty: 4 }], { a: 5, b: 1 })).toEqual([
      { materialId: "b", qty: 3 },
    ]);
  });

  it("derives caps and talent maxima", () => {
    expect(levelCaps(steps, 20)).toEqual([20, 40, 50, 60]);
    expect(talentMax(steps)).toBe(60);
    expect(talentMax([])).toBe(1);
  });
});

describe("planning against real catalogs", () => {
  it("Genshin: Amber 20→90 needs every ascension step; 80→90 only the last", async () => {
    const cat = catalogSchema.parse(await genshin.loadCatalog!());
    const amber = cat.characters.find((c) => c.id === "10000021")!;
    const full = characterRequirements(amber, { level: { from: 20, to: 90 } });
    const last = characterRequirements(amber, { level: { from: 80, to: 90 } });
    expect(full.find((r) => r.materialId === "202")!.qty).toBeGreaterThan(last.find((r) => r.materialId === "202")!.qty); // Mora
    expect(last).toEqual(sumSteps([amber.ascension.at(-1)!]));
    const talents = characterRequirements(amber, { talents: { normal: { from: 1, to: 10 } } });
    expect(talents.length).toBeGreaterThan(0);
    expect(characterRequirements(amber, { talents: { normal: { from: 10, to: 10 } } })).toEqual([]);
  });

  it("HSR: March 7th uses per-trace tables", async () => {
    const cat = catalogSchema.parse(await hsr.loadCatalog!());
    const march = cat.characters.find((c) => c.id === "1001")!;
    const basic = characterRequirements(march, { talents: { basic: { from: 1, to: 6 } } });
    const skill = characterRequirements(march, { talents: { skill: { from: 1, to: 10 } } });
    expect(basic.length).toBeGreaterThan(0);
    expect(skill.find((r) => r.materialId === "2")!.qty).toBeGreaterThan(basic.find((r) => r.materialId === "2")!.qty); // credits
    const cone = cat.weapons.find((w) => w.id === "20000")!;
    expect(weaponRequirements(cone, { from: 20, to: 80 }).length).toBeGreaterThan(0);
  });
});
