import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { cadenceWindow, conformance, gameList, getGame, hubResets, utcLabel, type CadenceAnchor, type GameDefinition, type GameRegion } from "@gacha/shared";

// Conformance suite (ADR 0004): every registered game's manifest, checked the same way.
const RUNS = { seed: 20261010, numRuns: 200 };
const instantArb = fc.integer({ min: Date.UTC(2024, 0, 1), max: Date.UTC(2030, 0, 1) }).map((t) => new Date(t));
const doc = (key: string) => readFileSync(new URL(`../../../../docs/games/${key}.md`, import.meta.url), "utf8");

/** Every cadence a game counts down to: daily, weekly, its monthly shops, its endgame modes and its version. */
function anchors(g: GameDefinition): [string, CadenceAnchor][] {
  const m = g.manifest;
  return [
    ["daily", { cadence: "daily" }],
    ["weekly", { cadence: "weekly" }],
    ...m.monthlyShops.map((s): [string, CadenceAnchor] => [s.name, { cadence: "monthly", day: s.day }]),
    ...m.endgame.map((e): [string, CadenceAnchor] => [e.name, e.anchor]),
    ["version", { cadence: "version", start: m.version.start, days: m.version.days }],
  ];
}

/** The server-local date a window boundary falls on. */
const localDate = (t: Date, r: GameRegion) => new Date(t.getTime() + r.utcOffsetMinutes * 60_000).toISOString().slice(0, 10);

describe.each(gameList.map((g) => [g.key, g] as const))("%s manifest", (key, g) => {
  it("has regions with whole-quarter-hour offsets, a reset hour and a weekday", () => {
    expect(new Set(g.regions.map((r) => r.key)).size).toBe(g.regions.length);
    for (const r of g.regions) {
      expect(Math.abs(r.utcOffsetMinutes) % 15).toBe(0); // abs: -300 % 15 is -0
      expect(Math.abs(r.utcOffsetMinutes)).toBeLessThanOrEqual(14 * 60);
      expect(r.dailyResetHour).toBeGreaterThanOrEqual(0);
      expect(r.dailyResetHour).toBeLessThanOrEqual(23);
      expect(r.weeklyResetWeekday).toBeGreaterThanOrEqual(1);
      expect(r.weeklyResetWeekday).toBeLessThanOrEqual(7);
    }
  });

  it("counts every cadence down from the region's reset, in every region", () => {
    for (const r of g.regions) {
      for (const [, a] of anchors(g)) {
        fc.assert(
          fc.property(instantArb, (now) => {
            const w = cadenceWindow(a, r, now);
            const startsAtReset = new Date(w.start.getTime() + r.utcOffsetMinutes * 60_000).getUTCHours() === r.dailyResetHour;
            return w.start <= now && now < w.end && startsAtReset && cadenceWindow(a, r, w.end).start.getTime() === w.end.getTime();
          }),
          RUNS,
        );
      }
    }
  });

  it("names a regenerating stamina currency, its reserve and its cap by level", () => {
    const { stamina } = g.manifest;
    const c = g.currencies.find((x) => x.key === stamina.currency);
    expect(c?.cap).toBeGreaterThan(0);
    expect(c?.regenPerHour).toBeGreaterThan(0);
    // The reserve is a currency of its own, so it is stored, edited and exported like one.
    if (stamina.reserve) expect(g.currencies.find((x) => x.key === stamina.reserve!.currency)?.cap).toBeGreaterThan(0);
    if (stamina.capAt) {
      const caps = Array.from({ length: 200 }, (_, l) => stamina.capAt!(l + 1));
      expect(caps.every((cap, i) => cap > 0 && (i === 0 || cap >= caps[i - 1]!))).toBe(true);
      expect(stamina.capAt(10_000)).toBe(c?.cap); // the currency's cap is the highest one
    }
  });

  it("has sane monthly shops, endgame modes and passes", () => {
    const { monthlyShops, endgame, battlePass, monthlyPass, version } = g.manifest;
    for (const s of monthlyShops) expect(s.day >= 1 && s.day <= 31).toBe(true);
    expect(new Set(endgame.map((e) => e.key)).size).toBe(endgame.length);
    for (const e of endgame) {
      expect(["monthly", "cycle", "version"]).toContain(e.anchor.cadence);
      if (e.anchor.cadence === "cycle" || e.anchor.cadence === "version") {
        expect(Number.isNaN(Date.parse(e.anchor.start))).toBe(false);
        expect(e.openDays ?? e.anchor.days).toBeLessThanOrEqual(e.anchor.days);
      }
      if (e.metric.max !== undefined) expect(e.metric.max).toBeGreaterThan(0);
      if (e.maxPremium !== undefined) expect(e.maxPremium).toBeGreaterThan(0);
    }
    if (battlePass?.maxLevel !== undefined) expect(battlePass.maxLevel).toBeGreaterThan(0);
    if (monthlyPass) expect(monthlyPass.days).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(version.start))).toBe(false);
    expect(version.days).toBeGreaterThan(0);
  });

  it("describes its gear block in the shape its build document takes", () => {
    const { gear } = g.manifest;
    expect(gear.slots.length).toBeGreaterThan(0);
    expect(new Set(gear.slots.map((x) => x.key)).size).toBe(gear.slots.length);
    expect(gear.sets.every((n) => n > 1)).toBe(true);
    const full = { [gear.field]: Object.fromEntries(gear.slots.map((x) => [x.key, { level: 0 }])) };
    expect(g.docSchema.safeParse(full).success).toBe(true);
  });

  it("raises a copy's dupe field by one up to the cap its build document allows", () => {
    const set = (path: string, v: number) => path.split(".").reduceRight<unknown>((inner, k) => ({ [k]: inner }), v) as object;
    for (const d of [g.manifest.dupes.character, g.manifest.dupes.weapon]) {
      if (!d) continue;
      expect(g.docSchema.safeParse(set(d.field, d.max)).success).toBe(true);
      expect(g.docSchema.safeParse(set(d.field, d.max + 1)).success).toBe(false);
    }
  });

  it("names up to three KPIs per build role, and an art source per kind with the key in it", () => {
    expect(Object.keys(g.manifest.kpis).length).toBeGreaterThan(0);
    for (const list of Object.values(g.manifest.kpis)) expect(list.length >= 1 && list.length <= 3).toBe(true);
    for (const url of Object.values(g.manifest.art)) expect(url).toMatch(/^https:\/\/.*\{key\}/);
  });

  it("is documented in docs/games, by name", () => {
    const text = doc(key);
    const m = g.manifest;
    const names = [
      g.currencies.find((c) => c.key === m.stamina.currency)?.label,
      g.currencies.find((c) => c.key === m.stamina.reserve?.currency)?.label,
      ...m.monthlyShops.map((s) => s.name),
      ...m.endgame.map((e) => e.name),
      m.battlePass?.name,
      m.monthlyPass?.name,
      m.version.name,
      m.accountLevel.name,
      m.gear.name,
      m.dupes.character.label,
      m.dupes.weapon?.label,
    ].filter((n): n is string => !!n);
    for (const n of names) expect(text, n).toContain(n);
  });
});

describe("the conformance suite", () => {
  it.each(gameList.map((g) => [g.key, g] as const))("%s passes it", (key, g) => {
    expect(conformance(g, doc(key))).toEqual([]);
  });

  it("reports what a broken manifest gets wrong", () => {
    const g = getGame("genshin")!;
    const broken = { ...g, regions: [{ ...g.regions[0]!, dailyResetHour: 24 }], manifest: { ...g.manifest, kpis: { damage: [] } } };
    expect(conformance(broken, doc("genshin"))).toEqual(expect.arrayContaining([expect.stringMatching(/reset hour/), expect.stringMatching(/KPIs/)]));
  });
});

describe("game facts", () => {
  it("runs Endfield on Asia (UTC+8) and Americas/Europe (UTC−5) servers, both at 04:00 with Monday weeklies", () => {
    expect(getGame("endfield")!.regions.map((r) => [r.utcOffsetMinutes, r.dailyResetHour, r.weeklyResetWeekday]).sort()).toEqual([
      [-300, 4, 1],
      [480, 4, 1],
    ]);
  });

  it("raises Endfield's Sanity cap with Authority Level, as the wiki's table does", () => {
    const capAt = getGame("endfield")!.manifest.stamina.capAt!;
    const table: [number, number][] = [[1, 125], [2, 130], [16, 200], [35, 295], [36, 298], [50, 340], [51, 342], [60, 360], [70, 360]];
    expect(table.map(([l]) => [l, capAt(l)])).toEqual(table);
    expect(getGame("endfield")!.currencies.find((c) => c.key === "sanity")!.regenPerHour).toBeCloseTo(3600 / 432); // 1 per 7 min 12 s
  });

  it("gives each endgame mode the cycle players saw on 10 October 2026, in server dates", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const seen: Record<string, Record<string, [string, string]>> = {
      genshin: { abyss: ["2026-09-16", "2026-10-16"], theater: ["2026-10-01", "2026-11-01"], stygian: ["2026-09-30", "2026-11-11"] },
      hsr: { moc: ["2026-09-28", "2026-12-14"], pf: ["2026-09-14", "2026-10-19"], as: ["2026-10-05", "2026-11-16"] },
      zzz: { shiyu: ["2026-10-02", "2026-10-16"], assault: ["2026-10-09", "2026-10-23"] },
      wuwa: { tower: ["2026-09-14", "2026-10-12"], wastes: ["2026-09-28", "2026-10-26"] },
      endfield: { echoes: ["2026-10-08", "2026-10-15"] },
    };
    for (const [key, modes] of Object.entries(seen)) {
      const g = getGame(key)!;
      const r = g.regions[0]!;
      const got = Object.fromEntries(
        g.manifest.endgame.map((e) => {
          const w = cadenceWindow(e.anchor, r, now);
          return [e.key, [localDate(w.start, r), localDate(w.end, r)]];
        }),
      );
      expect(got, key).toEqual(modes);
    }
  });

  it("names each game's account level, as the hub header shows it", () => {
    const expected = { genshin: "AR Adventure Rank", hsr: "TL Trailblaze Level", zzz: "IKL Inter-Knot Level", wuwa: "UL Union Level", endfield: "AL Authority Level" };
    // The games named here; a scaffolded game adds its own facts.
    expect(Object.fromEntries(Object.keys(expected).map((k) => [k, `${getGame(k)!.manifest.accountLevel.label} ${getGame(k)!.manifest.accountLevel.name}`]))).toEqual(expected);
  });

  it("gives the hub header its next daily and weekly resets and the version's end, on the profile's server", () => {
    const g = getGame("genshin")!;
    const eu = g.regions.find((r) => r.key === "eu")!;
    const r = hubResets(g, eu, new Date("2026-10-10T12:00:00Z"));
    expect([r.daily, r.weekly, r.versionEnd].map((d) => d.toISOString())).toEqual(["2026-10-11T03:00:00.000Z", "2026-10-12T03:00:00.000Z", "2026-11-04T03:00:00.000Z"]);
    expect([utcLabel(60), utcLabel(-300), utcLabel(480), utcLabel(345), utcLabel(0)]).toEqual(["UTC+1", "UTC−5", "UTC+8", "UTC+5:45", "UTC"]);
  });

  it("gives each game its gear block as the wikis describe it", () => {
    const expected = {
      genshin: ["Artifacts", 5, "2/4", null],
      hsr: ["Relics", 6, "2/4", null],
      zzz: ["Drive Discs", 6, "2/4", null],
      wuwa: ["Echoes", 5, "2/5", 12],
      endfield: ["Gear", 4, "3", null],
    };
    const shape = (k: string) => {
      const gear = getGame(k)!.manifest.gear;
      return [gear.name, gear.slots.length, gear.sets.join("/"), gear.costCap ?? null];
    };
    expect(Object.fromEntries(Object.keys(expected).map((k) => [k, shape(k)]))).toEqual(expected);
    const genshin = getGame("genshin")!.manifest.gear.slots;
    expect(genshin.find((x) => x.key === "circlet")?.mainStats).toContain("CRIT Rate%");
    expect(getGame("zzz")!.manifest.gear.slots.find((x) => x.key === "slot5")?.mainStats).toContain("PEN Ratio%");
  });

  it("tracks Neverness to Everness by hand, with what its official notices and research give", () => {
    const nte = getGame("nte")!;
    expect(nte.regions.map((r) => [r.key, r.utcOffsetMinutes, r.dailyResetHour, r.weeklyResetWeekday])).toEqual([
      ["asia", 480, 5, 1],
      ["na", -300, 5, 1],
      ["eu", 60, 5, 1],
      ["sea", 480, 5, 1],
    ]);
    const pixels = nte.currencies.find((c) => c.key === nte.manifest.stamina.currency)!;
    expect([pixels.label, pixels.cap, pixels.regenPerHour]).toEqual(["Character Pixels", 240, 10]);
    expect(nte.pullBanners!.map((b) => [b.label, b.hardPity, b.featuredRate])).toEqual([["Limited Board", 90, 1]]);
    expect(nte.manifest.battlePass).toMatchObject({ name: "Circle Bounty", maxLevel: 80, weeklyXpCap: 12_000 });
    expect(nte.manifest.version).toEqual({ name: "1.4", start: "2026-09-30", days: 42 });
    expect(nte.manifest.endgame.map((e) => [e.name, e.metric.max, e.maxPremium])).toEqual([["Beyond the Rails", 36, 800]]);
    expect(nte.manifest.monthlyShops).toEqual([{ key: "lost", name: "Lost Exchange", day: 1 }]);
  });

  it("closes Stygian Onslaught a week before the next version, as the wiki's season table shows", () => {
    const stygian = getGame("genshin")!.manifest.endgame.find((e) => e.key === "stygian")!;
    expect(stygian.openDays).toBe(35);
  });
});
