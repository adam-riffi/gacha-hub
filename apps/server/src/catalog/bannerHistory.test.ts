import { describe, expect, it } from "vitest";
import { getGame, type Catalog } from "@gacha/shared";

// Round 11's banner history (`npm run catalog:banners`): every past run, one banner per phase and kind, for the games a dated source covers.
describe.each([
  ["genshin", "2020-09-28"],
  ["hsr", "2023-04-26"],
])("%s's banner history", (gameKey, firstBannerDate) => {
  it("starts with the game's first banner, runs in date order, and features only units of the catalog", async () => {
    const game = getGame(gameKey)!;
    const history = await game.loadBannerHistory!();
    const catalog = (await game.loadCatalog!()) as Catalog;
    const knownIds = new Set([...catalog.characters.map((character) => character.id), ...catalog.weapons.map((weapon) => weapon.id)]);
    expect(history.banners[0]!.startsAt.slice(0, 10)).toBe(firstBannerDate);
    expect(history.banners.map((banner) => banner.startsAt)).toEqual([...history.banners.map((banner) => banner.startsAt)].sort());
    expect(history.banners.length).toBeGreaterThan(100);
    for (const banner of history.banners) {
      expect(banner.featured.length).toBeGreaterThan(0);
      for (const featured of banner.featured) expect(knownIds.has(featured.catalogId), `${banner.key}: ${featured.catalogId}`).toBe(true);
    }
  });
});

describe("games without a dated source", () => {
  // Round 17: Zenless, Wuthering Waves and NTE read theirs from their wikis' banner pages (`npm run catalog:banners-wiki`).
  it.each(["endfield"])("%s has no banner history yet", (gameKey) => {
    expect(getGame(gameKey)!.loadBannerHistory).toBeUndefined();
  });
  it.each(["zzz", "wuwa", "nte"])("%s has one from its wiki", async (gameKey) => {
    expect((await getGame(gameKey)!.loadBannerHistory!()).banners.length).toBeGreaterThan(10);
  });
});
