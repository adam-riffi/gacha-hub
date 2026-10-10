import { describe, expect, it } from "vitest";
import { gachaLogUrl, getGame, readGachaLogPage, readHistoryLink } from "@gacha/shared";
import { fetchHistory } from "./historyLink.js";

const genshin = getGame("genshin")!;
const zzz = getGame("zzz")!;
const KEY = "a/B+c=="; // authkeys are base64, so they carry characters a URL must escape
const pasted = `https://gs.hoyoverse.com/genshin/event/e20190909gacha-v3/index.html?authkey_ver=1&sign_type=2&lang=en&region=os_euro&authkey=${encodeURIComponent(KEY)}&game_biz=hk4e_global#/log`;

/** One official page in its documented shape (times at the server's offset, ids newest first). */
const page = (ids: string[], gachaType = "301", time = "2026-09-02 11:00:00") => ({
  retcode: 0,
  message: "OK",
  data: { page: "1", size: "20", total: "0", region: "os_euro", list: ids.map((id, i) => ({ uid: "700000001", gacha_type: gachaType, item_id: "", count: "1", time, name: "Cool Steel", lang: "en-us", item_type: "Weapon", rank_type: i === 0 ? "5" : "3", id })) },
});

describe("history links (ADR 0005)", () => {
  it("takes only the authkey and its few settings from a pasted link, whatever its host", () => {
    expect(readHistoryLink(pasted)).toEqual({ authkey: KEY, authkeyVer: "1", region: "os_euro" });
    expect(readHistoryLink(pasted.replace("gs.hoyoverse.com", "evil.example"))).toEqual({ authkey: KEY, authkeyVer: "1", region: "os_euro" });
    expect(readHistoryLink("https://gs.hoyoverse.com/index.html?lang=en")).toBeNull();
    expect(readHistoryLink("not a link")).toBeNull();
    expect(readHistoryLink(pasted.replace("region=os_euro", "region=x%20y"))).toEqual({ authkey: KEY, authkeyVer: "1", region: null });
  });

  it("asks the game's own official host, never the link's", () => {
    const link = readHistoryLink(pasted)!;
    const url = new URL(gachaLogUrl(genshin, link, "301", "0")!);
    expect(url.origin + url.pathname).toBe("https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog");
    expect(url.searchParams.get("authkey")).toBe(KEY);
    expect(url.searchParams.get("gacha_type")).toBe("301");
    expect(url.searchParams.get("end_id")).toBe("0");
    expect(url.searchParams.get("size")).toBe("20");
    expect(new URL(gachaLogUrl(zzz, link, "2", "0")!).searchParams.get("real_gacha_type")).toBe("2");
    expect(gachaLogUrl(getGame("wuwa")!, link, "1", "0")).toBeNull();
  });

  it("reads a page into records in UTC, and names the official errors", () => {
    expect(readGachaLogPage(page(["1700000000000000002", "1700000000000000001"]), 1)).toEqual({
      records: [
        { id: "1700000000000000002", gachaType: "301", time: new Date("2026-09-02T10:00:00Z"), rank: 5, itemId: undefined, name: "Cool Steel" },
        { id: "1700000000000000001", gachaType: "301", time: new Date("2026-09-02T10:00:00Z"), rank: 3, itemId: undefined, name: "Cool Steel" },
      ],
    });
    expect(readGachaLogPage({ retcode: -101, message: "authkey timeout", data: null }, 1)).toEqual({ records: [], error: "expired" });
    expect(readGachaLogPage({ retcode: -100, message: "authkey error", data: null }, 1)).toEqual({ records: [], error: "invalid" });
    expect(readGachaLogPage({ retcode: -110, message: "visit too frequently", data: null }, 1)).toEqual({ records: [], error: "too_frequent" });
    expect(readGachaLogPage("<html>", 1)).toEqual({ records: [], error: "refused" });
  });

  it("pages back from the newest until a record already stored, and hands back a cursor when time runs out", async () => {
    const asked: string[] = [];
    const pages: Record<string, unknown> = {
      "301:0": page(["105", "104"]),
      "301:104": page(["103", "102"]),
      "301:102": page([]),
    };
    const fetchFn = async (url: string) => {
      const u = new URL(url);
      asked.push(`${u.searchParams.get("gacha_type")}:${u.searchParams.get("end_id")}`);
      return { json: async () => pages[`${u.searchParams.get("gacha_type")}:${u.searchParams.get("end_id")}`] ?? page([]) };
    };
    const link = readHistoryLink(pasted)!;
    const all = await fetchHistory(genshin, link, 1, new Set(), null, { fetchFn, pauseMs: 0, budgetMs: 10_000 });
    expect(all.records.map((r) => r.id)).toEqual(["105", "104", "103", "102"]);
    expect(all.next).toBeNull();
    expect(asked).toEqual(["301:0", "301:104", "301:102", "302:0", "200:0"]);

    asked.length = 0;
    const again = await fetchHistory(genshin, link, 1, new Set(["104"]), null, { fetchFn, pauseMs: 0, budgetMs: 10_000 });
    expect(again.records.map((r) => r.id)).toEqual(["105"]);
    expect(asked).toEqual(["301:0", "302:0", "200:0"]);

    const cut = await fetchHistory(genshin, link, 1, new Set(), null, { fetchFn, pauseMs: 0, budgetMs: 0 });
    expect(cut.records.map((r) => r.id)).toEqual(["105", "104"]);
    expect(cut.next).toEqual({ gachaType: "301", endId: "104" });
    const rest = await fetchHistory(genshin, link, 1, new Set(), cut.next, { fetchFn, pauseMs: 0, budgetMs: 10_000 });
    expect(rest.records.map((r) => r.id)).toEqual(["103", "102"]);
  });

  it("stops at an official error and says which", async () => {
    const fetchFn = async () => ({ json: async () => ({ retcode: -101, message: "authkey timeout", data: null }) });
    expect(await fetchHistory(genshin, readHistoryLink(pasted)!, 1, new Set(), null, { fetchFn, pauseMs: 0, budgetMs: 10_000 })).toEqual({ records: [], next: null, error: "expired" });
  });
});
