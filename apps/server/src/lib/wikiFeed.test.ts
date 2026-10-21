import { describe, expect, it } from "vitest";
import type { Catalog } from "@gacha/shared";
import { parseWikiFeed, WIKI_FEEDS } from "./wikiFeed.js";

// Round 17 (Georges: "setup a pipeline to ingest any data like banner cards, event cards"): Wuthering Waves has no official
// feed; its wiki keeps a page per convene and per event with an infobox (type, server-time dates, picture), so the cron
// reads the newest pages of both categories like it reads HoYoverse's announcements.

const catalog = {
  characters: [
    { id: "1409", name: "Hsin", rarity: 5 },
    { id: "1203", name: "Taoqi", rarity: 4 },
  ],
  weapons: [{ id: "21020026", name: "Azure Oath", rarity: 5 }],
} as unknown as Catalog;

const convene = `{{Convene
|name              = As Full as Tonight, Forever 2026-09-30
|image             = As Full as Tonight, Forever 2026-09-30.jpg
|type              = Featured Resonator
|duration          = event
|time_start        = 2026-09-30 11:00
|time_end          = 2026-10-22 09:59
}}
{{Convene/Pool
|resonator_5_F = Hsin
|resonator_4_F = Buling;Taoqi;Youhu
}}`;

const weaponConvene = `{{Convene
|type              = Featured Weapon
|time_start        = 2026-09-30 11:00
|time_end          = 2026-10-22 09:59
}}
{{Convene/Pool
|weapon_5_F = Azure Oath
}}`;

const event = `{{Event Tabs
|rootpage          = Alloy Smelt/2024-09-16
}}
{{Event
| name = Alloy Smelt II
| image = Alloy Smelt 1.2.jpg
| type = In-Game
| group = Trial
| time_known = yes
| time_start = 2024-09-16 10:00
| time_start_offset =
| time_end = 2024-09-28 03:59
| time_end_offset =
| link = https://wutheringwaves.kurogames.com/en/main/news/detail/1306
}}
{{Description|Alloys.}}`;

const webEvent = `{{Event
| name = Pre-Registration
| type = Web
| time_start = 2024-05-01 00:00
| time_end = 2024-05-22 00:00
}}`;

describe("parseWikiFeed (Wuthering Waves)", () => {
  const { banners, events } = parseWikiFeed(
    {
      banners: [
        { title: "As Full as Tonight, Forever/2026-09-30", wikitext: convene },
        { title: "Absolute Pulsation: Azure Oath/2026-09-30", wikitext: weaponConvene },
      ],
      events: [
        { title: "Alloy Smelt/2024-09-16", wikitext: event },
        { title: "Pre-Registration", wikitext: webEvent },
      ],
    },
    WIKI_FEEDS.wuwa,
    catalog,
  );

  it("makes a banner per convene page, keyed to the wiki, its featured units by catalog id, its picture through the wiki", () => {
    expect(banners.map((banner) => [banner.key, banner.name, banner.kind, banner.startsAt, banner.endsAt])).toEqual([
      ["wiki-character-2026-09-30-as-full-as-tonight-forever", "As Full as Tonight, Forever", "character", "2026-09-30T11:00:00+08:00", "2026-10-22T09:59:00+08:00"],
      ["wiki-weapon-2026-09-30-absolute-pulsation-azure-oath", "Absolute Pulsation: Azure Oath", "weapon", "2026-09-30T11:00:00+08:00", "2026-10-22T09:59:00+08:00"],
    ]);
    expect(banners[0]!.featured).toEqual([
      { catalogId: "1409", kind: "character" },
      { catalogId: "1203", kind: "character" },
    ]);
    expect(banners[0]!.payload).toEqual({
      source: "wiki",
      page: "As Full as Tonight, Forever/2026-09-30",
      image: "https://wutheringwaves.fandom.com/wiki/Special:FilePath/As_Full_as_Tonight,_Forever_2026-09-30.jpg",
    });
    expect(banners[1]!.payload).toEqual({ source: "wiki", page: "Absolute Pulsation: Azure Oath/2026-09-30" });
  });

  it("makes an event per in-game event page, named by its infobox, dated in server time, its picture through the wiki; web events left out", () => {
    expect(events).toEqual([
      {
        key: "wiki-2024-09-16-alloy-smelt",
        name: "Alloy Smelt II",
        startsAt: "2024-09-16T10:00:00+08:00",
        endsAt: "2024-09-28T03:59:00+08:00",
        payload: { source: "wiki", page: "Alloy Smelt/2024-09-16", image: "https://wutheringwaves.fandom.com/wiki/Special:FilePath/Alloy_Smelt_1.2.jpg" },
      },
    ]);
  });
});
