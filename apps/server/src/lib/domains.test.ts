import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { DateTime, FixedOffsetZone } from "luxon";
import { domainsToday, farmableToday, gameWeekday, type Catalog } from "@gacha/shared";

const RUNS = { seed: 20261005, numRuns: 500 };

/** Reference: the luxon implementation the shared function replaces. */
function luxonWeekday(r: { utcOffsetMinutes: number; dailyResetHour: number }, now: Date): number {
  return DateTime.fromJSDate(now, { zone: FixedOffsetZone.instance(r.utcOffsetMinutes) })
    .minus({ hours: r.dailyResetHour })
    .weekday;
}

const regionArb = fc.record({
  utcOffsetMinutes: fc.integer({ min: -12 * 60, max: 14 * 60 }),
  dailyResetHour: fc.integer({ min: 0, max: 23 }),
});
const instantArb = fc.integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2035, 0, 1) }).map((t) => new Date(t));
const EU = { utcOffsetMinutes: 60, dailyResetHour: 4 };

describe("gameWeekday", () => {
  it("matches the luxon reference for any region and instant", () => {
    fc.assert(fc.property(regionArb, instantArb, (r, now) => gameWeekday(r, now) === luxonWeekday(r, now)), RUNS);
  });

  it("flips at the region's daily reset, not at midnight", () => {
    // Monday 2026-10-05; EU resets at 04:00 UTC+1 = 03:00 UTC.
    expect(gameWeekday(EU, new Date("2026-10-05T02:59:00Z"))).toBe(7);
    expect(gameWeekday(EU, new Date("2026-10-05T03:00:00Z"))).toBe(1);
  });

  it("moves to the next weekday every 24 hours", () => {
    fc.assert(
      fc.property(regionArb, instantArb, (r, now) => {
        const next = gameWeekday(r, new Date(now.getTime() + 86_400_000));
        return next === (gameWeekday(r, now) % 7) + 1;
      }),
      RUNS,
    );
  });
});

describe("farmableToday", () => {
  it("treats missing or empty availability as always farmable", () => {
    expect(farmableToday(undefined, 3)).toBe(true);
    expect(farmableToday([], 3)).toBe(true);
    expect(farmableToday([1, 4, 7], 4)).toBe(true);
    expect(farmableToday([1, 4, 7], 5)).toBe(false);
  });
});

// ---- domainsToday ----------------------------------------------------------

const step = (ids: string[]) => ({ atLevel: 2, materials: ids.map((materialId) => ({ materialId, qty: 1 })) });
const char = (id: string, talentMats: string[], costsByKey?: Record<string, ReturnType<typeof step>[]>) => ({
  id,
  key: id,
  name: id[0]!.toUpperCase() + id.slice(1),
  rarity: 4,
  maxLevel: 90,
  ascension: [step(["ascension-gem"])],
  talents: { keys: ["normal", "skill", "burst"], costs: talentMats.length ? [step(talentMats)] : [], costsByKey },
});
const mat = (id: string, source: string | undefined, availability: number[], rarity: number, category = "Character Talent Material") => ({
  id,
  key: id,
  name: `${id} name`,
  category,
  rarity,
  availability,
  source,
});

const catalog = {
  gameKey: "genshin",
  source: "fixture",
  characters: [
    char("amber", ["freedom-2", "freedom-4"]),
    char("lisa", ["ballad-3"]),
    char("xiao", [], { burst: [step(["prosperity-4"])] }),
    char("klee", ["freedom-2"]),
  ],
  weapons: [{ id: "sword", key: "sword", name: "Sword", rarity: 4, maxLevel: 90, ascension: [step(["tile-2"])] }],
  gear: [],
  materials: [
    mat("freedom-2", "Domain of Mastery: Frosted Altar", [1, 4, 7], 2),
    mat("freedom-4", "Domain of Mastery: Frosted Altar", [1, 4, 7], 4),
    mat("ballad-3", "Domain of Mastery: Realm of Slumber", [3, 6, 7], 3),
    mat("prosperity-4", "Domain of Mastery: Altar of Flames", [1, 4, 7], 4),
    mat("tile-2", "Domain of Forgery: Cecilia Garden", [2, 5, 7], 2, "Weapon Ascension Material"),
    mat("ascension-gem", "World boss", [1, 2, 3, 4, 5, 6, 7], 4),
    mat("orphan", undefined, [1], 4),
  ],
} as unknown as Catalog;

const owned = [
  { kind: "character" as const, catalogId: "amber" },
  { kind: "character" as const, catalogId: "lisa" },
  { kind: "character" as const, catalogId: "xiao" },
  { kind: "weapon" as const, catalogId: "sword" },
];
const sources = (ds: ReturnType<typeof domainsToday>) => ds.map((d) => d.source);

describe("domainsToday", () => {
  it("lists the domains open today that an owned unit levels from", () => {
    const monday = domainsToday(catalog, owned, new Set(), 1);
    expect(sources(monday).sort()).toEqual(["Domain of Mastery: Altar of Flames", "Domain of Mastery: Frosted Altar"]);
    const frosted = monday.find((d) => d.source.endsWith("Frosted Altar"))!;
    expect(frosted.units.map((u) => u.id)).toEqual(["amber"]); // klee is not owned
    expect(frosted.top.id).toBe("freedom-4"); // highest rarity of the family
  });

  it("reads per-talent cost tables and weapon ascension", () => {
    expect(domainsToday(catalog, owned, new Set(), 1).find((d) => d.source.endsWith("Altar of Flames"))?.units[0]?.id).toBe("xiao");
    const tuesday = domainsToday(catalog, owned, new Set(), 2);
    expect(tuesday.map((d) => [d.source, d.units.map((u) => `${u.kind}:${u.id}`)])).toEqual([
      ["Domain of Forgery: Cecilia Garden", ["weapon:sword"]],
    ]);
  });

  it("opens every rotating domain on Sunday but never lists always-open or sourceless materials", () => {
    expect(sources(domainsToday(catalog, owned, new Set(), 7)).sort()).toEqual([
      "Domain of Forgery: Cecilia Garden",
      "Domain of Mastery: Altar of Flames",
      "Domain of Mastery: Frosted Altar",
      "Domain of Mastery: Realm of Slumber",
    ]);
  });

  it("ranks domains and units with a build first", () => {
    const ranked = domainsToday(catalog, owned, new Set(["xiao"]), 1);
    expect(ranked[0]?.source).toBe("Domain of Mastery: Altar of Flames");
    expect(ranked[0]?.units[0]?.built).toBe(true);
  });

  it("only ever lists open domains and owned units", () => {
    const ownedArb = fc.subarray(owned);
    fc.assert(
      fc.property(ownedArb, fc.integer({ min: 1, max: 7 }), (mine, day) => {
        const ownedIds = new Set(mine.map((o) => `${o.kind}:${o.catalogId}`));
        return domainsToday(catalog, mine, new Set(), day).every(
          (d) =>
            d.units.length > 0 &&
            catalog.materials.some((m) => m.source === d.source && m.availability?.includes(day)) &&
            d.units.every((u) => ownedIds.has(`${u.kind}:${u.id}`)),
        );
      }),
      RUNS,
    );
  });
});
