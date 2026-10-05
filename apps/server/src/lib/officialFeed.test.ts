import { describe, expect, it } from "vitest";
import type { Catalog } from "@gacha/shared";
import { parseFeed, settle, type AnnList } from "./officialFeed.js";

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
});
