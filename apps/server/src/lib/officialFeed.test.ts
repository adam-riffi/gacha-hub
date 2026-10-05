import { describe, expect, it } from "vitest";
import type { Catalog } from "@gacha/shared";
import { parseFeed, parseHsrFeed, settle, type AnnList, type HsrAnnList } from "./officialFeed.js";

const catalog = {
  characters: [
    { id: "vesna", name: "Vesna", rarity: 5 },
    { id: "diona", name: "Diona", rarity: 4 },
    { id: "amber", name: "Amber", rarity: 4 },
  ],
  weapons: [
    { id: "chrysalis", name: "Beyond the Chrysalis", rarity: 5 },
    { id: "bane", name: "Dragon's Bane", rarity: 4 },
  ],
} as unknown as Catalog;

const ann = (ann_id: number, type: number, subtitle: string) => ({
  ann_id,
  type,
  subtitle,
  start_time: "2026-09-21 12:00:00",
  end_time: "2026-10-13 17:59:00",
});

const data: AnnList = {
  timezone: 1,
  list: [
    { type_id: 2, list: [ann(1, 2, "Version 7.1 Update Details")] },
    {
      type_id: 1,
      list: [
        ann(10, 1, 'Event Wish "When Warm Winds Cavort"'),
        ann(11, 1, 'Event Wish "Epitome Invocation"'),
        ann(12, 1, '"The Hunt Begins!"'),
        ann(13, 1, "Initial Top-Up Bonus Reset"),
      ],
    },
  ],
};
const contents = new Map([
  [10, "<p>Promotional Character (5-Star) <t>2026/10/13</t> Vesna (Anemo) Diona (Cryo)</p>"],
  [11, "<p>Beyond the Chrysalis &amp; Dragon's Bane, also Vesna</p>"],
]);

describe("parseFeed", () => {
  const { banners, events } = parseFeed(data, contents, catalog);

  it("maps wishes to banners with featured units, 5★ first", () => {
    expect(banners.map((b) => [b.key, b.name, b.kind])).toEqual([
      ["hoyo-10", "When Warm Winds Cavort", "character"],
      ["hoyo-11", "Epitome Invocation", "weapon"],
    ]);
    expect(banners[0]!.featured.map((f) => f.catalogId)).toEqual(["vesna", "diona"]);
    // weapon banners only feature weapons, even when a character is named
    expect(banners[1]!.featured.map((f) => f.catalogId)).toEqual(["chrysalis", "bane"]);
  });

  it("reads times as server time (UTC+timezone)", () => {
    expect(new Date(banners[0]!.startsAt).toISOString()).toBe("2026-09-21T11:00:00.000Z");
  });

  it("keeps events, drops non-event tabs and shop noise", () => {
    expect(events.map((e) => [e.key, e.name])).toEqual([["hoyo-12", "The Hunt Begins!"]]);
  });
});

describe("settle", () => {
  const t = (iso: string) => new Date(iso);
  it("keeps the earlier time of a 7h-shifted pair, either order", () => {
    expect(settle(t("2026-09-21T04:00:00Z"), t("2026-09-21T11:00:00Z"))).toEqual(t("2026-09-21T04:00:00Z"));
    expect(settle(t("2026-09-21T11:00:00Z"), t("2026-09-21T04:00:00Z"))).toEqual(t("2026-09-21T04:00:00Z"));
  });
  it("takes real changes and first imports as-is", () => {
    expect(settle(t("2026-10-13T16:59:00Z"), t("2026-10-20T16:59:00Z"))).toEqual(t("2026-10-20T16:59:00Z"));
    expect(settle(undefined, t("2026-10-13T16:59:00Z"))).toEqual(t("2026-10-13T16:59:00Z"));
  });

  // The feed serves Asia (+8), Europe (+1) or America (-5) clock values, all
  // labelled +1. Europe is X; Asia reads as X+7h, America as X-6h.
  const X = Date.parse("2026-09-27T06:00:00Z");
  const h = (n: number) => new Date(X + n * 3_600_000);
  it("keeps the later time of a 6h pair (Europe vs America)", () => {
    expect(settle(h(-6), h(0))).toEqual(h(0));
    expect(settle(h(0), h(-6))).toEqual(h(0));
  });
  it("recovers Europe from a 13h pair (Asia vs America)", () => {
    expect(settle(h(7), h(-6))).toEqual(h(0));
    expect(settle(h(-6), h(7))).toEqual(h(0));
  });
  it("stays on Europe once found, whatever variant comes next", () => {
    for (const next of [h(7), h(0), h(-6)]) expect(settle(h(0), next)).toEqual(h(0));
  });
});

// ---- HSR: one "Event Warp" notice holds several warps with their own dates ----

const hsrCatalog = {
  characters: [
    { id: "pearl", name: "Pearl", rarity: 5 },
    { id: "evanescia", name: "Evanescia", rarity: 5 },
    { id: "qingque", name: "Qingque", rarity: 4 },
    { id: "misha", name: "Misha", rarity: 4 },
  ],
  weapons: [
    { id: "colors", name: "Colors for Tomorrow", rarity: 5 },
    { id: "bloom", name: "Until the Flowers Bloom Again", rarity: 5 },
    { id: "choreo", name: "Boundless Choreo", rarity: 4 },
  ],
} as unknown as Catalog;

const hsrAnn = (ann_id: number, title: string) => ({ ann_id, title, start_time: "2026-09-27 14:00:00", end_time: "2026-10-21 11:59:00" });
const t = (date: string) => `&lt;t class="t_lc"&gt;${date}&lt;/t&gt;`;

const hsrList: HsrAnnList = {
  timezone: 1,
  list: [{ type_id: 1, list: [] }],
  pic_list: [
    {
      type_list: [
        {
          list: [
            hsrAnn(100, "Version 4.6 Event Warp: Phase I"),
            hsrAnn(101, '"Love, Ghosts &amp; Robots": Run the workshop to earn rewards'),
            hsrAnn(102, "Astral Imagea Park: Set up your own park"),
            hsrAnn(103, "Version 4.6 Store Update"),
            hsrAnn(104, "Fate Collaboration Warp Details"),
            hsrAnn(105, ""),
          ],
        },
      ],
    },
  ],
};

const warpNotice = [
  '<p>"An Ocean in a Pearl" and "Brilliant Fixation: Colors for Tomorrow" Event Warps</p>',
  '<p>During the "An Ocean in a Pearl" Character Event Warp, the limited 5-star character Pearl (Elation: Ice) and 4-star characters Qingque (Erudition: Quantum) and Misha (Destruction: Ice) will be boosted.</p>',
  `<table><tr><td>After the Version 4.6 update – ${t("2026/11/10 15:00:00")}</td><td>Pearl Qingque Misha</td></tr></table>`,
  '<p>During the "Brilliant Fixation: Colors for Tomorrow" Light Cone Event Warp, the limited 5-star Light Cone "Colors for Tomorrow (Elation)" and the 4-star Light Cone "Boundless Choreo (Nihility)" will be boosted.</p>',
  `<table><tr><td>After the Version 4.6 update – ${t("2026/11/10 15:00:00")}</td></tr></table>`,
  '<p>"The Demoiselle in Charge" and "Bygone Reminiscence: Until the Flowers Bloom Again" Event Warps</p>',
  '<p>During "The Demoiselle in Charge" Character Event Warp, the limited 5-star character Evanescia (Elation: Physical) and 4-star character Misha (Destruction: Ice) will be boosted.</p>',
  `<table><tr><td>${t("2026/10/14 12:00:00")} – ${t("2026/10/21 11:59:00")}</td></tr></table>`,
  "<p>※ During the Event Warp period, Pearl can only be obtained from the character warp.</p>",
].join("");

describe("parseHsrFeed", () => {
  const { banners, events } = parseHsrFeed(hsrList, new Map([[100, warpNotice]]), hsrCatalog);
  const byKey = new Map(banners.map((b) => [b.key, b]));

  it("splits an Event Warp notice into one banner per warp", () => {
    expect(banners.map((b) => [b.key, b.name, b.kind])).toEqual([
      ["hoyo-100-an-ocean-in-a-pearl", "An Ocean in a Pearl", "character"],
      ["hoyo-100-brilliant-fixation-colors-for-tomorrow", "Brilliant Fixation: Colors for Tomorrow", "weapon"],
      ["hoyo-100-the-demoiselle-in-charge", "The Demoiselle in Charge", "character"],
    ]);
  });

  it("features only the units named for that warp, 5★ first", () => {
    expect(byKey.get("hoyo-100-an-ocean-in-a-pearl")!.featured.map((f) => f.catalogId)).toEqual(["pearl", "qingque", "misha"]);
    expect(byKey.get("hoyo-100-brilliant-fixation-colors-for-tomorrow")!.featured.map((f) => f.catalogId)).toEqual(["colors", "choreo"]);
    expect(byKey.get("hoyo-100-the-demoiselle-in-charge")!.featured.map((f) => f.catalogId)).toEqual(["evanescia", "misha"]);
  });

  it("gives each warp its own period (notice start when only the end is stated)", () => {
    const pearl = byKey.get("hoyo-100-an-ocean-in-a-pearl")!;
    expect(new Date(pearl.startsAt).toISOString()).toBe("2026-09-27T13:00:00.000Z");
    expect(new Date(pearl.endsAt).toISOString()).toBe("2026-11-10T14:00:00.000Z");
    const rerun = byKey.get("hoyo-100-the-demoiselle-in-charge")!;
    expect(new Date(rerun.startsAt).toISOString()).toBe("2026-10-14T11:00:00.000Z");
    expect(new Date(rerun.endsAt).toISOString()).toBe("2026-10-21T10:59:00.000Z");
  });

  it("keeps events by their short name and drops shop, collab warps and untitled notices", () => {
    expect(events.map((e) => [e.key, e.name])).toEqual([
      ["hoyo-101", "Love, Ghosts & Robots"],
      ["hoyo-102", "Astral Imagea Park"],
    ]);
  });
});
