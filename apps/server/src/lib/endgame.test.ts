import { describe, expect, it } from "vitest";
import { endgameNow, getGame } from "@gacha/shared";

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
