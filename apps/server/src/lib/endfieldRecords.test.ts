import { describe, expect, it } from "vitest";
import {
  getGame,
  pullsFromRecords,
  readRecordsLink,
  readRecordsPage,
  recordsUrl,
} from "@gacha/shared";
import { charPage, weaponPage } from "../test/fixtures/endfield.js";
import { fetchRecords } from "./endfieldRecords.js";

const endfield = getGame("endfield")!;
// The canonical form trackers rebuild from the game's webview cache (ADR 0009).
const pasted =
  "https://ef-webview.gryphline.com/api/record/char?lang=en-us&pool_type=E_CharacterGachaPoolType_Special&token=AbC123%2Bdef%2F456%3D&server_id=3";

describe("Endfield records links (ADR 0009)", () => {
  it("keeps the token, server and language from a pasted records link, whatever its host", () => {
    const link = { token: "AbC123+def/456=", serverId: "3", lang: "en-us" };
    expect(readRecordsLink(pasted)).toEqual(link);
    expect(readRecordsLink(pasted.replace("ef-webview.gryphline.com", "evil.example"))).toEqual(
      link,
    );
    // The game's own page names them u8_token and server.
    expect(
      readRecordsLink(
        "https://ef-webview.gryphline.com/page/gacha_char?u8_token=AbC123%2Bdef%2F456%3D&server=3",
      ),
    ).toEqual(link);
    expect(readRecordsLink(pasted.replace("server_id=3", "server_id=3x"))).toBeNull();
    expect(
      readRecordsLink(pasted.replace("token=AbC123%2Bdef%2F456%3D", "token=a%20b")),
    ).toBeNull();
    expect(
      readRecordsLink("https://ef-webview.gryphline.com/api/record/char?server_id=3"),
    ).toBeNull();
    expect(readRecordsLink("not a link")).toBeNull();
  });

  it("asks the game's own records API: characters by pool type, weapons in one list, paged by seq_id", () => {
    const link = readRecordsLink(pasted)!;
    const char = new URL(recordsUrl(link, "E_CharacterGachaPoolType_Special", null));
    expect(`${char.origin}${char.pathname}`).toBe(
      "https://ef-webview.gryphline.com/api/record/char",
    );
    expect(Object.fromEntries(char.searchParams)).toEqual({
      lang: "en-us",
      token: "AbC123+def/456=",
      server_id: "3",
      pool_type: "E_CharacterGachaPoolType_Special",
    });
    const weapon = new URL(recordsUrl(link, "weapon", "1290"));
    expect(`${weapon.origin}${weapon.pathname}`).toBe(
      "https://ef-webview.gryphline.com/api/record/weapon",
    );
    expect(Object.fromEntries(weapon.searchParams)).toEqual({
      lang: "en-us",
      token: "AbC123+def/456=",
      server_id: "3",
      seq_id: "1290",
    });
  });

  it("reads a page of records: ids from their pool and sequence, UTC times, the next cursor; gift records skipped", () => {
    const page = readRecordsPage(charPage, "E_CharacterGachaPoolType_Special");
    expect(page.error).toBeUndefined();
    expect(page.next).toBe("1288");
    expect(page.records).toEqual([
      {
        id: "special-1290",
        gachaType: "E_CharacterGachaPoolType_Special",
        time: new Date(1791400000000),
        rank: 6,
        itemId: "chr_0016_laevat",
        name: "Laevatain",
      },
      {
        id: "special-1289",
        gachaType: "E_CharacterGachaPoolType_Special",
        time: new Date(1791400000000),
        rank: 4,
        itemId: "chr_0011_seraph",
        name: "Perlica",
      },
      {
        id: "special-1288",
        gachaType: "E_CharacterGachaPoolType_Special",
        time: new Date(1791300000000),
        rank: 5,
        itemId: "chr_0009_azrila",
        name: "Ardelia",
      },
    ]);
    expect(
      readRecordsPage(
        { ...charPage, data: { ...charPage.data, hasMore: false } },
        "E_CharacterGachaPoolType_Special",
      ).next,
    ).toBeNull();
    expect(
      readRecordsPage(weaponPage, "weapon").records.map((r) => [r.id, r.itemId, r.rank]),
    ).toEqual([["weapon-77", "wpn_sword_0006", 6]]);
  });

  it("calls an answer with an error code expired, and anything else refused", () => {
    expect(readRecordsPage({ code: 3, msg: "token expired", data: null }, "weapon")).toEqual({
      records: [],
      next: null,
      error: "expired",
    });
    expect(readRecordsPage("<html>", "weapon")).toEqual({
      records: [],
      next: null,
      error: "refused",
    });
  });

  it("feeds Endfield's three pities: Chartered, Arsenal and Basic headhunting; a 6★ is the top pull, a 5★ is not", () => {
    expect(endfield.topRarity).toBe(6);
    const records = [
      ...readRecordsPage(charPage, "E_CharacterGachaPoolType_Special").records,
      ...readRecordsPage(weaponPage, "weapon").records,
      {
        id: "standard-5",
        gachaType: "E_CharacterGachaPoolType_Standard",
        time: new Date(1791000000000),
        rank: 4,
      },
      {
        id: "beginner-1",
        gachaType: "E_CharacterGachaPoolType_Beginner",
        time: new Date(1790000000000),
        rank: 6,
      },
    ];
    const { pulls, skipped } = pullsFromRecords(endfield, records, []);
    expect(skipped).toBe(1);
    expect(pulls.map((p) => [p.recordId, p.bannerKey, p.fiveStar])).toEqual([
      ["standard-5", "standard", false],
      ["special-1288", "character", false],
      ["weapon-77", "weapon", true],
      ["special-1289", "character", false],
      ["special-1290", "character", true],
    ]);
  });

  it("hands back where to pick up when its time runs out, and picks up there", async () => {
    const asked: URL[] = [];
    const fetchFn = async (url: string) => {
      const u = new URL(url);
      asked.push(u);
      const empty = { code: 0, data: { list: [], hasMore: false } };
      return { json: async () => (u.pathname.endsWith("/char") && u.searchParams.get("pool_type") === "E_CharacterGachaPoolType_Special" && !u.searchParams.get("seq_id") ? charPage : empty) };
    };
    const link = readRecordsLink(pasted)!;
    const first = await fetchRecords(endfield, link, new Set(), null, { fetchFn, pauseMs: 0, budgetMs: 0 });
    expect(first.records).toHaveLength(3);
    expect(first.next).toEqual({ gachaType: "E_CharacterGachaPoolType_Special", endId: "1288" });
    asked.length = 0;
    const rest = await fetchRecords(endfield, link, new Set(), first.next, { fetchFn, pauseMs: 0 });
    expect(rest).toEqual({ records: [], next: null });
    expect(asked.map((u) => u.searchParams.get("seq_id") ?? u.searchParams.get("pool_type") ?? "weapon")).toEqual(["1288", "weapon", "E_CharacterGachaPoolType_Standard"]);
  });
});
