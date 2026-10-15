import { describe, expect, it } from "vitest";
import { PullBudget, currencyKind, featuredWithin, getGame, pullsFor } from "@gacha/shared";

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

// Round 11's review: Home's banners say which banner matters to you, with your chance at its top unit.
describe("PullBudget", () => {
  const hsr = getGame("hsr")!;
  const currencies = [
    { value: 1600, pullCost: 160, pullLabel: "warp" },
    { value: 3, pullCost: 1, pullLabel: "warp" },
  ];
  const characterRules = hsr.pullBanners!.find((banner) => banner.key === "character")!;
  it("gives a banner kind's chance at its featured 5★ with the limited pulls on hand, from its pity", () => {
    const budget = new PullBudget(hsr.pullBanners!, currencies, [{ key: "character", pity: 40, guaranteed: false }]);
    expect(budget.pullsOn("character")).toBe(13);
    expect(budget.chanceOn("character")).toBeCloseTo(featuredWithin(characterRules, { pity: 40, guaranteed: false }, 13));
    // A lost 50/50 makes the next 5★ the featured one: a better chance with the same pulls.
    const guaranteed = new PullBudget(hsr.pullBanners!, currencies, [{ key: "character", pity: 40, guaranteed: true }]);
    expect(guaranteed.chanceOn("character")!).toBeGreaterThan(budget.chanceOn("character")!);
  });
  it("counts a banner's own tickets on it, reads no pity as zero, and has no chance where the game has no such banner", () => {
    const endfield = getGame("endfield")!;
    const arsenal = new PullBudget(endfield.pullBanners!, [{ value: 3960, pullCost: 198, pullLabel: "pull", onlyFor: "weapon" }], []);
    expect(arsenal.pullsOn("weapon")).toBe(20);
    expect(arsenal.pullsOn("character")).toBe(0);
    expect(new PullBudget(hsr.pullBanners!, currencies, []).chanceOn("character")).toBeCloseTo(featuredWithin(characterRules, { pity: 0, guaranteed: false }, 13));
    expect(new PullBudget(hsr.pullBanners!, currencies, []).chanceOn("other")).toBeNull();
  });
});
