import { describe, expect, it } from "vitest";
import { cycleCsv, cycleHistory, endgameNow, getGame } from "@gacha/shared";

const genshin = getGame("genshin")!;
const EU = genshin.regions.find((r) => r.key === "eu")!;
const now = new Date("2026-10-10T12:00:00Z");

describe("endgameNow", () => {
  it("adds up the premium claimed in the current cycles against what they offer", () => {
    const e = endgameNow(genshin, EU, now, [
      { modeKey: "abyss", cycleStart: new Date("2026-09-16T03:00:00Z"), result: 33, premium: 700 },
      { modeKey: "theater", cycleStart: new Date("2026-10-01T03:00:00Z"), result: 8, premium: 800 },
      { modeKey: "abyss", cycleStart: new Date("2026-08-16T03:00:00Z"), result: 36, premium: 800 }, // an earlier cycle
    ]);
    expect(e.claimed).toBe(1500);
    expect(e.max).toBe(2250); // 800 + 1,000 + 450, as on the G2 board
    expect(e.modes.map((m) => [m.mode.key, m.result, m.premium])).toEqual([
      ["abyss", 33, 700],
      ["theater", 8, 800],
      ["stygian", null, 0],
    ]);
  });

  it("names the next reset and what is still unclaimed in it", () => {
    const e = endgameNow(genshin, EU, now, [{ modeKey: "abyss", cycleStart: new Date("2026-09-16T03:00:00Z"), result: 33, premium: 700 }]);
    expect(e.next?.mode.key).toBe("abyss");
    expect(e.next?.closes.toISOString()).toBe("2026-10-16T03:00:00.000Z");
    expect(e.next?.unclaimed).toBe(100);
  });

  it("closes a mode that closes before its next cycle, and leaves it out of what is claimable", () => {
    const later = new Date("2026-11-06T12:00:00Z"); // Stygian closed on 4 Nov, reopens on 11 Nov
    const stygian = endgameNow(genshin, EU, later, []).modes.find((m) => m.mode.key === "stygian")!;
    expect(stygian.open).toBe(false);
    expect(endgameNow(genshin, EU, later, []).max).toBe(1800);
  });
});

describe("cycleHistory", () => {
  const abyss = genshin.manifest.endgame.find((e) => e.key === "abyss")!;
  const r = (start: string, result: number | null, premium: number | null, detail: string | null = null) => ({
    modeKey: "abyss",
    cycleStart: new Date(start),
    result,
    premium,
    detail,
    source: "manual",
  });
  const results = [
    r("2026-09-16T03:00:00Z", 33, 700, "floor 12 · 6/9"), // current
    r("2026-08-16T03:00:00Z", 34, 700),
    r("2026-07-16T03:00:00Z", 36, 800),
    r("2026-06-16T03:00:00Z", 35, 700),
    r("2026-05-16T03:00:00Z", 36, 800),
    { ...r("2026-09-01T03:00:00Z", 8, 800), modeKey: "theater" },
  ];

  it("lists one mode's cycles newest first, with their ends, the current one and full clears", () => {
    const h = cycleHistory(abyss, EU, now, results);
    expect(h.rows.map((x) => [x.cycleStart.toISOString().slice(0, 10), x.end.toISOString().slice(0, 10), x.current, x.full])).toEqual([
      ["2026-09-16", "2026-10-16", true, false],
      ["2026-08-16", "2026-09-16", false, false],
      ["2026-07-16", "2026-08-16", false, true],
      ["2026-06-16", "2026-07-16", false, false],
      ["2026-05-16", "2026-06-16", false, true],
    ]);
  });

  it("gives the best and how often, the average of completed cycles, and the premium earned of what was offered", () => {
    const h = cycleHistory(abyss, EU, now, results);
    expect(h).toMatchObject({ best: 36, bestTimes: 2, completed: 4, earned: 3700, offered: 4000 });
    expect(h.bestLast?.toISOString()).toBe("2026-07-16T03:00:00.000Z");
    expect(h.average).toBeCloseTo((34 + 36 + 35 + 36) / 4);
  });

  it("exports a CSV with server-local dates, quoting what needs it", () => {
    const csv = cycleCsv(abyss, EU, cycleHistory(abyss, EU, now, [r("2026-09-16T03:00:00Z", 33, 700, 'floor 12, "6/9"')]).rows, "Primogems");
    expect(csv.split("\n")).toEqual(["first day,last day,stars,detail,Primogems,source", '2026-09-16,2026-10-15,33,"floor 12, ""6/9""",700,manual']);
  });
});
