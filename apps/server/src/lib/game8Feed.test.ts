import { describe, expect, it } from "vitest";
import type { Catalog } from "@gacha/shared";
import { GAME8_FEEDS, parseGame8Banners, parseGame8Events } from "./game8Feed.js";

// Round 18 (Georges, round 17: "setup a pipeline to ingest any data like banner cards, event cards… don't hesitate to check
// out websites like game8"): Endfield has no official feed and its wiki no dates; Game8's banner schedule and event pages
// are tables of pictures, names, versions and M/D/Y dates, which the cron reads like a feed.

const catalog = {
  characters: [
    { id: "chr_si", name: "Si", rarity: 6 },
    { id: "chr_liino", name: "Liino", rarity: 5 },
    { id: "chr_ember", name: "Ember", rarity: 6 },
  ],
  weapons: [],
} as unknown as Catalog;

const banners = `<table><tr><th colspan="2">Character Banner Dates</th></tr>
<tr><td width="50%" class="top center"><a class="a-link" href="/x"><img class="a-img lazy lazy-non-square" alt="Arknights Endfield Rejuvenation" data-src="https://img.game8.co/4641271/3f13.png/show" width="728">Rejuvenation</a> <br> (Ver. 1.6 Phase 1) <br>10/15/2026 - 11/05/2026 <hr class="a-table__line"> <div class="align"> <a class="a-link" href="/y"><img class="a-img lazy" alt="Arknights Endfield Si Icon" data-src="https://img.game8.co/4641242/b999.png/show" width="45" height="45"></a> <a class="a-link" href="/z"><img class="a-img lazy" alt="Arknights Endfield Liino Icon" data-src="https://img.game8.co/4556231/c73b.png/show" width="45" height="45"></a> <a class="a-link" href="/t"><img class="a-img lazy" alt="Arknights Endfield Typhoeus Icon" data-src="https://img.game8.co/4596574/2c68.png/show" width="45"></a></div></td>
<td width="50%" class="top center"><a class="a-link" href="/w"><img alt="Arknights Endfield Ancestral Spring Flows Anew" data-src="https://img.game8.co/1/a.png/show">Ancestral Spring Flows Anew</a> <br> (Ver. 1.6 Phase 1) <br>10/29/2026 - 11/19/2026 <hr> <div class="align"><a href="/q"><img alt="Arknights Endfield Ember Icon" data-src="https://img.game8.co/2/b.png/show"></a></div></td></tr>
<tr><th colspan="2">Weapon Banner Dates</th></tr>
<tr><td><a class="a-link" href="/v"><img alt="Arknights Endfield Seal of Jade Issue" data-src="https://img.game8.co/3/c.png/show">Seal of Jade Issue</a> <br> (Ver. 1.6 Phase 1) <br>10/15/2026 - TBD</td><td><a class="a-link" href="/u"><img alt="Arknights Endfield Tender Sprig Issue" data-src="https://img.game8.co/4/d.png/show">Tender Sprig Issue</a> <br> (Ver. 1.6 Phase 1) <br>10/29/2026 - 11/19/2026</td></tr></table>
<table><tr><th>★ Featured 6-Star Characters ★</th></tr><tr><td><img alt="Endfield Ember" data-src="https://img.game8.co/9/z.png/show">Ember</td></tr></table>`;

const events = `<table><tr><td class="top center"><div class="align"><div class="imageLink"><img class="a-img lazy" alt="Yuanyuan’s Blazing Stoves" data-src="https://img.game8.co/5/e.png/show"></div></div> <hr> <a class="a-link" href="/e1">Yuanyuan’s Blazing Stoves</a><br>(Version 1.6)<br>10/15/2026 - 11/26/2026</td>
<td class="top center"><a class="a-link" href="/e3"><img alt="Spirit" data-src="https://img.game8.co/7/g.png/show">Spirit&#39;s Restoration Sign-In</a><br>(Version 1.6)<br>10/15/2026 - 11/05/2026</td></tr></table>
<table><tr><th>Event</th><th>Schedule &amp; Summary</th></tr>
<tr><td class="center"><a class="a-link" href="/e2"><img class="a-img lazy" alt="Arknights Endfield Carly" data-src="https://img.game8.co/6/f.png/show"> Carly's Verdant Anthology</a></td><td><b class="a-bold">Period:</b> 10/22/2026 - 11/05/2026 <hr class="a-table__line"> Help Carly.</td></tr>
<tr><td class="center"><a class="a-link" href="/e4">Someday</a></td><td><b class="a-bold">Period:</b> TBD</td></tr></table>`;

describe("parseGame8Banners (Endfield)", () => {
  const parsed = parseGame8Banners(banners, GAME8_FEEDS.endfield, catalog);

  it("makes a banner per dated cell under each kind's heading, in the game's server time, its picture from Game8; a TBD end is not a run", () => {
    expect(parsed.map((banner) => [banner.key, banner.name, banner.kind, banner.startsAt, banner.endsAt])).toEqual([
      ["game8-character-2026-10-15-rejuvenation", "Rejuvenation", "character", "2026-10-15T04:00:00-05:00", "2026-11-05T04:00:00-05:00"],
      ["game8-character-2026-10-29-ancestral-spring-flows-anew", "Ancestral Spring Flows Anew", "character", "2026-10-29T04:00:00-05:00", "2026-11-19T04:00:00-05:00"],
      ["game8-weapon-2026-10-29-tender-sprig-issue", "Tender Sprig Issue", "weapon", "2026-10-29T04:00:00-05:00", "2026-11-19T04:00:00-05:00"],
    ]);
    expect(parsed[0]!.payload).toEqual({ source: "game8", page: GAME8_FEEDS.endfield.banners, version: "1.6 Phase 1", image: "https://img.game8.co/4641271/3f13.png/show" });
  });

  it("features the operators whose icons the cell shows, by catalog id; names the catalog lacks are left out", () => {
    expect(parsed[0]!.featured).toEqual([
      { catalogId: "chr_si", kind: "character" },
      { catalogId: "chr_liino", kind: "character" },
    ]);
    expect(parsed[1]!.featured).toEqual([{ catalogId: "chr_ember", kind: "character" }]);
    expect(parsed[2]!.featured).toEqual([]);
  });
});

describe("parseGame8Events (Endfield)", () => {
  it("makes an event per dated cell or row, named by its link, its picture from Game8; undated ones left out", () => {
    expect(parseGame8Events(events, GAME8_FEEDS.endfield)).toEqual([
      { key: "game8-2026-10-15-yuanyuan-s-blazing-stoves", name: "Yuanyuan’s Blazing Stoves", startsAt: "2026-10-15T04:00:00-05:00", endsAt: "2026-11-26T04:00:00-05:00", payload: { source: "game8", page: GAME8_FEEDS.endfield.events, image: "https://img.game8.co/5/e.png/show" } },
      { key: "game8-2026-10-15-spirit-s-restoration-sign-in", name: "Spirit's Restoration Sign-In", startsAt: "2026-10-15T04:00:00-05:00", endsAt: "2026-11-05T04:00:00-05:00", payload: { source: "game8", page: GAME8_FEEDS.endfield.events, image: "https://img.game8.co/7/g.png/show" } },
      { key: "game8-2026-10-22-carly-s-verdant-anthology", name: "Carly's Verdant Anthology", startsAt: "2026-10-22T04:00:00-05:00", endsAt: "2026-11-05T04:00:00-05:00", payload: { source: "game8", page: GAME8_FEEDS.endfield.events, image: "https://img.game8.co/6/f.png/show" } },
    ]);
  });
});
