import { describe, expect, it } from "vitest";
import { currencyKind, getGame, pullsFor } from "@gacha/shared";

describe("pullsFor", () => {
  it("counts limited pulls, and keeps standard tickets and each banner's own tickets (special: Endfield's Arsenal Tickets, ZZZ's Boopons) apart", () => {
    expect(
      pullsFor([
        { value: 5000, pullCost: 500, pullLabel: "headhunt" },
        { value: 3960, pullCost: 198, pullLabel: "pull", onlyFor: "weapon" },
        { value: 7, pullCost: 1, pullLabel: "signal", onlyFor: "bangboo" },
        { value: 3, pullCost: 1, pullLabel: "wish", standardOnly: true },
        { value: 99 },
      ]),
    ).toEqual({ limited: 10, standard: 3, special: 27, only: { weapon: 20, bangboo: 7 }, label: "headhunt" });
  });

  it("tracks WuWa's Forging Tide for the weapon banner and ZZZ's Boopons for the Bangboo channel", () => {
    const only = (game: string, key: string) => getGame(game)!.currencies.find((c) => c.key === key)?.onlyFor;
    expect([only("wuwa", "forgingTide"), only("zzz", "boopon"), only("endfield", "arsenal")]).toEqual(["weapon", "bangboo", "weapon"]);
  });
});

// Georges, round 7: "add icons wherever there can be … I need icons to understand quickly": each currency by its kind.
describe("currencyKind", () => {
  it("names ZZZ's and Genshin's currencies by what they are", () => {
    const zzz = getGame("zzz")!;
    expect(zzz.currencies.map((c) => currencyKind(zzz, c))).toEqual(["stamina", "reserve", "premium", "ticket", "standard", "special", "coin"]);
    const genshin = getGame("genshin")!;
    expect(genshin.currencies.map((c) => [c.key, currencyKind(genshin, c)])).toEqual([
      ["resin", "stamina"],
      ["condensedResin", "reserve"],
      ["primogems", "premium"],
      ["intertwinedFate", "ticket"],
      ["acquaintFate", "standard"],
      ["mora", "coin"],
    ]);
  });
});
