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

describe("the games whose history comes from a wiki", () => {
  // Round 17: Zenless, Wuthering Waves and NTE read theirs from their wikis' banner pages; round 20: Endfield from its wiki's
  // banner table (both `npm run catalog:banners-wiki`). Every game has a dated history now.
  it.each(["zzz", "wuwa", "nte", "endfield"])("%s has one from its wiki", async (gameKey) => {
    expect((await getGame(gameKey)!.loadBannerHistory!()).banners.length).toBeGreaterThan(10);
  });
  it("Endfield's features the catalog's operators and runs in date order", async () => {
    const history = await getGame("endfield")!.loadBannerHistory!();
    const catalog = (await getGame("endfield")!.loadCatalog!()) as Catalog;
    const ids = new Set(catalog.characters.map((character) => character.id));
    expect(history.banners.map((banner) => banner.startsAt)).toEqual([...history.banners.map((banner) => banner.startsAt)].sort());
    for (const banner of history.banners) for (const featured of banner.featured) expect(ids.has(featured.catalogId), `${banner.key}: ${featured.catalogId}`).toBe(true);
    expect(history.banners.find((banner) => banner.name === "Rejuvenation")?.featured.map((featured) => featured.catalogId)).toEqual(["chr_0036_jsspsi", expect.any(String), expect.any(String)]);
  });
});
