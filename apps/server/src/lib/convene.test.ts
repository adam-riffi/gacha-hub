import { describe, expect, it } from "vitest";
import { conveneRequest, getGame, readConveneLink, readConvenePage } from "@gacha/shared";
import { fetchConvene } from "./convene.js";

const wuwa = getGame("wuwa")!;
const pasted =
  "https://aki-gm-resources-oversea.aki-game.net/aki/gacha/index.html#/record?svr_id=6eb2a235b30d05efd77bedb5cf60999e&player_id=700000001&lang=en&gacha_id=100001&gacha_type=6&svr_area=global&record_id=0f9e8d7c6b5a49382716abcdef012345&resources_id=917dfa695d6c6634ee4e972bb9168f6a";
/** Convene records as the game returns them: newest first, no record id. */
const rec = (name: string, qualityLevel: number, time: string, resourceId: number, cardPoolType = "Featured Resonator Convene") => ({ cardPoolType, resourceId, qualityLevel, resourceType: "Resonators", name, count: 1, time });

describe("Wuthering Waves convene links (ADR 0005)", () => {
  it("reads the ids from a pasted convene link, whose values sit after the #, whatever its host", () => {
    const link = { playerId: "700000001", serverId: "6eb2a235b30d05efd77bedb5cf60999e", recordId: "0f9e8d7c6b5a49382716abcdef012345", cardPoolId: "917dfa695d6c6634ee4e972bb9168f6a", lang: "en", global: true };
    expect(readConveneLink(pasted)).toEqual(link);
    expect(readConveneLink(pasted.replace("aki-gm-resources-oversea.aki-game.net", "evil.example"))).toEqual(link);
    expect(readConveneLink(pasted.replace("player_id=700000001", "player_id=7%20x"))).toBeNull();
    expect(readConveneLink("https://aki-gm-resources-oversea.aki-game.net/aki/gacha/index.html#/record?lang=en")).toBeNull();
  });

  it("posts to the game's own convene API, one banner type at a time", () => {
    const r = conveneRequest(readConveneLink(pasted)!, "1");
    expect(r.url).toBe("https://gmserver-api.aki-game2.net/gacha/record/query");
    expect(JSON.parse(r.body)).toEqual({ playerId: "700000001", cardPoolId: "917dfa695d6c6634ee4e972bb9168f6a", cardPoolType: 1, serverId: "6eb2a235b30d05efd77bedb5cf60999e", languageCode: "en", recordId: "0f9e8d7c6b5a49382716abcdef012345" });
    expect(conveneRequest({ ...readConveneLink(pasted)!, global: false }, "1").url).toBe("https://gmserver-api.aki-game2.com/gacha/record/query");
  });

  it("gives each pull an id from its time, banner and place within that second, oldest first", () => {
    const page = { code: 0, message: "success", data: [rec("Jiyan", 5, "2026-09-02 18:00:00", 1404), rec("Sanhua", 4, "2026-09-02 18:00:00", 1102), rec("Sanhua", 4, "2026-09-01 08:30:00", 1102)] };
    expect(readConvenePage(page, "1", 8)).toEqual({
      records: [
        { id: "20260901083000010", gachaType: "1", time: new Date("2026-09-01T00:30:00Z"), rank: 4, itemId: "1102", name: "Sanhua" },
        { id: "20260902180000010", gachaType: "1", time: new Date("2026-09-02T10:00:00Z"), rank: 4, itemId: "1102", name: "Sanhua" },
        { id: "20260902180000011", gachaType: "1", time: new Date("2026-09-02T10:00:00Z"), rank: 5, itemId: "1404", name: "Jiyan" },
      ],
    });
    expect(readConvenePage({ code: -1, message: "record id expired", data: null }, "1", 8)).toEqual({ records: [], error: "expired" });
    expect(readConvenePage("<html>", "1", 8)).toEqual({ records: [], error: "refused" });
  });

  it("asks each tracked banner type once, and stops at an error", async () => {
    const asked: number[] = [];
    const fetchFn = async (_url: string, init?: { body?: string }) => {
      const type = (JSON.parse(init!.body!) as { cardPoolType: number }).cardPoolType;
      asked.push(type);
      return { json: async () => ({ code: 0, message: "success", data: type === 1 ? [rec("Jiyan", 5, "2026-09-02 18:00:00", 1404)] : [] }) };
    };
    const got = await fetchConvene(wuwa, readConveneLink(pasted)!, 8, { fetchFn, pauseMs: 0 });
    expect(asked).toEqual([1, 2, 3, 4, 5, 6]);
    expect(got.records.map((r) => r.id)).toEqual(["20260902180000010"]);
    const failing = async () => ({ json: async () => ({ code: -1, message: "error", data: null }) });
    expect(await fetchConvene(wuwa, readConveneLink(pasted)!, 8, { fetchFn: failing, pauseMs: 0 })).toEqual({ records: [], error: "expired" });
  });
});
