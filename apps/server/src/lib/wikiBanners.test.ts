import { describe, expect, it } from "vitest";
import { bannerHistorySchema, getGame, historyFromWikiPages, historyFromWikiTable, parseTemplate, WIKI_BANNER_SOURCES, type Catalog } from "@gacha/shared";

// Round 17 (Georges: "still no banner history"): the game wikis keep one page per banner run, "<name>/<start date>", with an
// infobox (type, start, end) and an item pool (the featured units); that is the dated history for Zenless, Wuthering
// Waves and NTE.

const zzzCatalog = {
  characters: [
    { id: "1171", name: "Burnice", rarity: 5 },
    { id: "1031", name: "Nicole", rarity: 4 },
    { id: "1011", name: "Anby", rarity: 4 },
    { id: "1091", name: "Miyabi", rarity: 5 },
  ],
  weapons: [
    { id: "14115", name: "Flamemaker Shaker", rarity: 5 },
    { id: "13003", name: "Kaboom the Cannon", rarity: 4 },
  ],
} as unknown as Catalog;

const bornToBurn = `{{Signal Search Infobox
|name              = Born to Burn 2024-10-16
|image             = Born to Burn 2024-10-16.png
|type              = Exclusive Channel
|duration          = event
|time_start        = 2024-10-16 12:00:00
|time_start_offset =
|time_end          = 2024-11-05 14:59:59
|time_end_offset   =
}}
{{Lead/Signal Search|Born to Burn/2024-10-16}}
===Item Pool===
{{Signal Search Pool
|agent_S_F    = Burnice White;Hoshimi Miyabi
|agent_A_F    = Luciana de Montefio;Nicole Demara
|agent_S      = Alexandrina Sebastiane;Grace Howard
|agent_A      = Anby Demara;Anton Ivanov
}}`;

const dissonantSonata = `{{Signal Search Infobox
|name              = Dissonant Sonata 2024-10-16
|type              = W-Engine Channel
|time_start        = 2024-10-16 18:00:00
|time_start_offset = GMT+8
|time_end          = 2024-11-05 14:59:59
}}
{{Signal Search Pool
|w-engine_S_F = Flamemaker Shaker
|w-engine_A_F = Kaboom the Cannon;The Vault
|agent_A      = Anby Demara
}}`;

const stable = `{{Signal Search Infobox
|name = Star-Studded Cast
|type = Stable Channel
|time_start = 2024-07-04 10:00:00
|time_end =
}}`;

describe("parseTemplate", () => {
  it("reads a template's fields, trimmed, empty ones included", () => {
    expect(parseTemplate(bornToBurn, "Signal Search Infobox")).toMatchObject({ type: "Exclusive Channel", time_start: "2024-10-16 12:00:00", time_start_offset: "" });
    expect(parseTemplate(bornToBurn, "Signal Search Pool")?.agent_A_F).toBe("Luciana de Montefio;Nicole Demara");
    expect(parseTemplate(bornToBurn, "Nothing Here")).toBeUndefined();
  });
});

describe("historyFromWikiPages", () => {
  const pages = [
    { title: "Born to Burn/2024-10-16", wikitext: bornToBurn },
    { title: "Dissonant Sonata/2024-10-16", wikitext: dissonantSonata },
    { title: "Star-Studded Cast", wikitext: stable },
  ];
  const { history, unmatched } = historyFromWikiPages(pages, WIKI_BANNER_SOURCES.zzz, zzzCatalog);

  it("makes one banner per dated page, its kind from the infobox type, its times in the wiki's server time (UTC+8)", () => {
    expect(history.map((banner) => [banner.key, banner.name, banner.kind, banner.startsAt, banner.endsAt])).toEqual([
      ["history-character-2024-10-16-born-to-burn", "Born to Burn", "character", "2024-10-16T12:00:00+08:00", "2024-11-05T14:59:59+08:00"],
      ["history-weapon-2024-10-16-dissonant-sonata", "Dissonant Sonata", "weapon", "2024-10-16T18:00:00+08:00", "2024-11-05T14:59:59+08:00"],
    ]);
  });

  it("features the pool's rate-up units only, matched to the catalog by name or by the one word they share, top rarity first", () => {
    expect(history[0]!.featured).toEqual([
      { catalogId: "1171", kind: "character", rarity: 5 },
      { catalogId: "1091", kind: "character", rarity: 5 },
      { catalogId: "1031", kind: "character", rarity: 4 },
    ]);
    expect(history[1]!.featured).toEqual([
      { catalogId: "14115", kind: "weapon", rarity: 5 },
      { catalogId: "13003", kind: "weapon", rarity: 4 },
    ]);
  });

  it("names the units the catalog does not know and leaves permanent channels out", () => {
    expect(unmatched).toEqual(["character Luciana de Montefio", "weapon The Vault"]);
    expect(history.some((banner) => banner.name === "Star-Studded Cast")).toBe(false);
  });

  it("is a banner history the app reads", () => {
    expect(() => bannerHistorySchema.parse({ source: "test", banners: history })).not.toThrow();
  });

  it("reads Wuthering Waves' Convene pages and NTE's Fair pages the same way", () => {
    const wuwa = historyFromWikiPages(
      [{ title: "Absolute Pulsation: Azure Oath/2026-07-10", wikitext: `{{Convene\n|type = Featured Weapon\n|time_start = 2026-07-10 09:10\n|time_end = 2026-07-30 09:59\n}}\n{{Convene/Pool\n|weapon_5_F = Azure Oath\n|weapon_4_F = Discord\n}}` }],
      WIKI_BANNER_SOURCES.wuwa,
      { characters: [], weapons: [{ id: "21020026", name: "Azure Oath", rarity: 5 }, { id: "21020014", name: "Discord", rarity: 4 }] } as unknown as Catalog,
    ).history;
    expect(wuwa).toEqual([{ key: "history-weapon-2026-07-10-absolute-pulsation-azure-oath", name: "Absolute Pulsation: Azure Oath", kind: "weapon", startsAt: "2026-07-10T09:10:00+08:00", endsAt: "2026-07-30T09:59:00+08:00", featured: [{ catalogId: "21020026", kind: "weapon", rarity: 5 }, { catalogId: "21020014", kind: "weapon", rarity: 4 }] }]);
    const nte = historyFromWikiPages(
      [{ title: "Dazzling Star/2026-10-21", wikitext: `{{Fair\n|type = Limited\n|time_start = 2026-10-21 11:00:00\n|time_start_offset = GMT+8\n|time_end = 2026-11-11 5:59:59\n}}\n{{Board Pool\n|character_S_F = Akane Rin\n|character_A_F =\n|Item_S_F = Shining Idol*Shining Idol\n}}` }],
      WIKI_BANNER_SOURCES.nte,
      { characters: [{ id: "1024", name: "Akane Rin", rarity: 5 }], weapons: [] } as unknown as Catalog,
    ).history;
    expect(nte).toEqual([{ key: "history-character-2026-10-21-dazzling-star", name: "Dazzling Star", kind: "character", startsAt: "2026-10-21T11:00:00+08:00", endsAt: "2026-11-11T05:59:59+08:00", featured: [{ catalogId: "1024", kind: "character", rarity: 5 }] }]);
  });
});

// Round 20: Endfield's wiki (wiki.gg) keeps its banners in a data table instead of pages: a row per run with the rate-up
// operator, the limited roster and each server group's times. The Americas/Europe times are kept (the Game8 feed's clock).
describe("historyFromWikiTable (Endfield)", () => {
  const catalog = {
    characters: [
      { id: "chr_0036_jsspsi", name: "Si", rarity: 6 },
      { id: "chr_0040_typhoeus", name: "Typhoeus", rarity: 6 },
      { id: "chr_0041_liino", name: "Liino", rarity: 6 },
      { id: "chr_0030_xaihi", name: "Xaihi", rarity: 5 },
      { id: "chr_0033_yvonne", name: "Yvonne", rarity: 6 },
    ],
    weapons: [],
  } as unknown as Catalog;
  const { history, unmatched } = historyFromWikiTable(
    [
      { Banner: "Resplendent Spectrum", RateUpOperator: "", LimitedOperators: "Yvonne", QuotaOperator: "Alesh", AmeuStartTime: "2026-09-24 17:00:00", AmeuEndTime: "2026-10-14 21:59:59" },
      { Banner: "Rejuvenation", RateUpOperator: "Si", LimitedOperators: "Si;Typhoeus;Liino", QuotaOperator: "Xaihi", AmeuStartTime: "2026-10-15 04:00:00", AmeuEndTime: "2026-11-05 16:59:59" },
      { Banner: "Ancestral Spring Flows Anew", RateUpOperator: "", LimitedOperators: "Tangtang", QuotaOperator: "", AmeuStartTime: "2026-10-29 17:00:00", AmeuEndTime: "2026-11-19 03:59:59" },
      { Banner: "Not dated yet", RateUpOperator: "Si", LimitedOperators: "Si", QuotaOperator: "", AmeuStartTime: "2026-12-01 04:00:00", AmeuEndTime: "" },
    ],
    catalog,
  );

  it("makes one character banner per dated row, in Americas/Europe server time (UTC-5), in date order", () => {
    expect(history.map((banner) => [banner.key, banner.name, banner.kind, banner.startsAt, banner.endsAt])).toEqual([
      ["history-character-2026-09-24-resplendent-spectrum", "Resplendent Spectrum", "character", "2026-09-24T17:00:00-05:00", "2026-10-14T21:59:59-05:00"],
      ["history-character-2026-10-15-rejuvenation", "Rejuvenation", "character", "2026-10-15T04:00:00-05:00", "2026-11-05T16:59:59-05:00"],
      ["history-character-2026-10-29-ancestral-spring-flows-anew", "Ancestral Spring Flows Anew", "character", "2026-10-29T17:00:00-05:00", "2026-11-19T03:59:59-05:00"],
    ]);
  });

  it("features the rate-up operator first, then the rest of the limited roster, each once, with the catalog's rarity; the quota pick is not featured", () => {
    expect(history[1]!.featured).toEqual([
      { catalogId: "chr_0036_jsspsi", kind: "character", rarity: 6 },
      { catalogId: "chr_0040_typhoeus", kind: "character", rarity: 6 },
      { catalogId: "chr_0041_liino", kind: "character", rarity: 6 },
    ]);
    expect(history[0]!.featured).toEqual([{ catalogId: "chr_0033_yvonne", kind: "character", rarity: 6 }]);
  });

  it("names the operators the catalog does not know, and is a banner history the app reads", () => {
    expect(unmatched).toEqual(["character Tangtang"]);
    expect(history[2]!.featured).toEqual([]);
    expect(() => bannerHistorySchema.parse({ source: "test", banners: history })).not.toThrow();
  });
});

describe("the histories the importer wrote", () => {
  it.each([
    ["zzz", 100],
    ["wuwa", 100],
    ["nte", 10],
    ["endfield", 15],
  ])("%s loads at least %i banners, dated, in order, each with its featured units", async (gameKey, atLeast) => {
    const history = await getGame(gameKey)!.loadBannerHistory!();
    expect(history.banners.length).toBeGreaterThanOrEqual(atLeast);
    expect(history.banners.map((banner) => banner.startsAt)).toEqual([...history.banners.map((banner) => banner.startsAt)].sort());
    expect(history.banners.filter((banner) => banner.featured.length === 0).length).toBeLessThan(history.banners.length / 10);
  });
});
