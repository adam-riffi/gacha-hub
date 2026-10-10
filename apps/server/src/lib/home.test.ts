import { describe, expect, it } from "vitest";
import { expiringSoon, getGame, nextResets } from "@gacha/shared";
import { staminaProjection } from "./regen.js";

const genshin = getGame("genshin")!;
const zzz = getGame("zzz")!;
const eu = (g: typeof genshin) => g.regions.find((r) => r.key === "eu")!;
const none = { battle: null, monthly: null };

describe("nextResets (Home: Endgame · next resets)", () => {
  it("lists open modes with stars or premium left, soonest first", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const rows = nextResets(
      [
        {
          game: genshin,
          region: eu(genshin),
          passes: none,
          events: [],
          results: [
            { modeKey: "abyss", cycleStart: new Date("2026-09-16T03:00:00Z"), result: 33, premium: 700 },
            { modeKey: "theater", cycleStart: new Date("2026-10-01T03:00:00Z"), result: 10, premium: 1000 }, // done
          ],
        },
        { game: zzz, region: eu(zzz), passes: none, events: [], results: [] },
      ],
      now,
    );
    expect(rows.map((r) => [r.game, r.mode, r.closes.toISOString().slice(0, 10), r.result, r.max, r.unclaimed])).toEqual([
      ["Genshin", "Spiral Abyss", "2026-10-16", 33, 36, 100],
      ["Zenless", "Shiyu Defense", "2026-10-16", null, 5, 780],
      ["Zenless", "Deadly Assault", "2026-10-23", null, 9, 300],
      ["Genshin", "Stygian Onslaught", "2026-11-04", null, 6, 450],
    ]);
  });
});

describe("expiringSoon (Home: Expiring soon)", () => {
  it("lists events, 30-day passes and unfinished battle passes ending within 72 hours, soonest first", () => {
    const now = new Date("2026-11-02T12:00:00Z"); // version 7.1 ends 4 Nov, 04:00 Europe time
    const rows = expiringSoon(
      [
        {
          game: genshin,
          region: eu(genshin),
          results: [],
          passes: { battle: { level: 34, weeklyXp: 0, updatedAt: new Date("2026-10-20T10:00:00Z") }, monthly: { endsAt: new Date("2026-11-04T03:00:00Z") } },
          events: [
            { name: "Silverwing in Pursuit of the Moon", endsAt: new Date("2026-11-03T18:00:00Z") },
            { name: "Later event", endsAt: new Date("2026-11-10T18:00:00Z") },
          ],
        },
      ],
      now,
    );
    expect(rows.map((r) => [r.label, r.endsAt.toISOString()])).toEqual([
      ["Silverwing in Pursuit of the Moon", "2026-11-03T18:00:00.000Z"],
      ["Blessing of the Welkin Moon", "2026-11-04T03:00:00.000Z"],
      ["Gnostic Hymn · Lv 34/50", "2026-11-04T03:00:00.000Z"],
    ]);
  });
});

describe("staminaProjection", () => {
  it("caps Endfield's Sanity at the profile's Authority Level", () => {
    const endfield = getGame("endfield")!;
    const now = new Date("2026-10-10T12:00:00Z");
    const rows = [{ key: "sanity", value: 100, updatedAt: new Date(now.getTime() - 30 * 3_600_000) }];
    expect(staminaProjection(endfield, rows, now, 20)).toMatchObject({ cap: 220, value: 220, full: true });
    expect(staminaProjection(endfield, rows, now, null)?.cap).toBe(360);
  });
});
