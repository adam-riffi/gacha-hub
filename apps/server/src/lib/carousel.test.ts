import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { byNearestDeadline, perBannerMs, slotMs, stepBanner, stepGame, type CarouselPosition } from "@gacha/shared";

// VISUAL-DESIGN.md §7: a game with more banners stays longer (6 s plus 3 s per
// extra banner) but shows each banner for less; the nearest deadline comes first.
describe("carousel timing", () => {
  it("holds a game 6 s plus 3 s per extra banner", () => {
    expect(slotMs(1)).toBe(6000);
    expect(slotMs(2)).toBe(9000);
    expect(slotMs(3)).toBe(12000);
  });

  it("splits the game's time between its banners", () => {
    expect(perBannerMs(1)).toBe(6000);
    expect(perBannerMs(3)).toBe(4000);
  });

  it("gives a game without banners one empty slot", () => {
    expect(slotMs(0)).toBe(6000);
    expect(perBannerMs(0)).toBe(6000);
  });
});

describe("byNearestDeadline", () => {
  const games = [
    { key: "a", ends: [Date.parse("2026-10-20T00:00:00Z"), Date.parse("2026-10-12T00:00:00Z")] },
    { key: "b", ends: [Date.parse("2026-10-11T00:00:00Z")] },
    { key: "c", ends: [] },
    { key: "d", ends: [Date.parse("2026-10-11T00:00:00Z")] },
  ];

  it("orders games by their earliest deadline, ties and deadline-less games keeping their order", () => {
    expect(byNearestDeadline(games, (g) => g.ends).map((g) => g.key)).toEqual(["b", "d", "a", "c"]);
  });

  it("leaves the input untouched", () => {
    const copy = games.map((g) => g.key);
    byNearestDeadline(games, (g) => g.ends);
    expect(games.map((g) => g.key)).toEqual(copy);
  });
});

describe("stepping", () => {
  const counts = [2, 1, 3]; // banners per game, in carousel order

  it("steps through a game's banners, then to the next game's first banner, and wraps", () => {
    const seen: CarouselPosition[] = [];
    let pos: CarouselPosition = { game: 0, banner: 0 };
    for (let i = 0; i < 6; i++) {
      pos = stepBanner(pos, 1, counts);
      seen.push(pos);
    }
    expect(seen).toEqual([
      { game: 0, banner: 1 },
      { game: 1, banner: 0 },
      { game: 2, banner: 0 },
      { game: 2, banner: 1 },
      { game: 2, banner: 2 },
      { game: 0, banner: 0 },
    ]);
  });

  it("steps back to the previous game's last banner", () => {
    expect(stepBanner({ game: 0, banner: 0 }, -1, counts)).toEqual({ game: 2, banner: 2 });
    expect(stepBanner({ game: 2, banner: 1 }, -1, counts)).toEqual({ game: 2, banner: 0 });
  });

  it("treats a game without banners as one empty slot", () => {
    expect(stepBanner({ game: 0, banner: 0 }, 1, [1, 0, 1])).toEqual({ game: 1, banner: 0 });
    expect(stepBanner({ game: 1, banner: 0 }, 1, [1, 0, 1])).toEqual({ game: 2, banner: 0 });
  });

  it("jumps a whole game at a time, landing on its first banner", () => {
    expect(stepGame({ game: 2, banner: 2 }, 1, 3)).toEqual({ game: 0, banner: 0 });
    expect(stepGame({ game: 0, banner: 1 }, -1, 3)).toEqual({ game: 2, banner: 0 });
  });

  it("stays put with no games", () => {
    expect(stepBanner({ game: 0, banner: 0 }, 1, [])).toEqual({ game: 0, banner: 0 });
    expect(stepGame({ game: 0, banner: 0 }, 1, 0)).toEqual({ game: 0, banner: 0 });
  });

  it("a full lap forward returns to the start, and back undoes forward", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 8 }), (cs) => {
        const lap = cs.reduce((s, c) => s + Math.max(1, c), 0);
        let pos: CarouselPosition = { game: 0, banner: 0 };
        for (let i = 0; i < lap; i++) {
          const next = stepBanner(pos, 1, cs);
          expect(stepBanner(next, -1, cs)).toEqual(pos);
          pos = next;
        }
        expect(pos).toEqual({ game: 0, banner: 0 });
      }),
    );
  });
});
