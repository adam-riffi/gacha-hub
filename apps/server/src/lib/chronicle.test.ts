import { describe, expect, it } from "vitest";
import { chronicleRequests, readChronicle } from "@gacha/shared";

const ok = (data: object) => ({ retcode: 0, message: "OK", data });
const now = new Date("2026-10-10T12:00:00Z");
const unix = (iso: string) => String(Date.parse(iso) / 1000);

describe("the battle chronicle (ADR 0005)", () => {
  it("asks each game's endgame records on their hosts", () => {
    expect(chronicleRequests("genshin", "eu", "700000001")).toEqual([
      { modeKey: "abyss", url: "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/spiralAbyss?server=os_euro&role_id=700000001&schedule_type=1" },
      { modeKey: "theater", url: "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/role_combat?server=os_euro&role_id=700000001&need_detail=false" },
      { modeKey: "stygian", url: "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/hard_challenge?server=os_euro&role_id=700000001&need_detail=false" },
    ]);
    expect(chronicleRequests("hsr", "na", "600000001").map((r) => [r.modeKey, new URL(r.url).pathname.split("/").at(-1), new URL(r.url).searchParams.get("server")])).toEqual([
      ["moc", "challenge", "prod_official_usa"],
      ["pf", "challenge_story", "prod_official_usa"],
      ["as", "challenge_boss", "prod_official_usa"],
    ]);
    const zzz = chronicleRequests("zzz", "asia", "1300000001");
    expect(zzz.map((r) => r.modeKey)).toEqual(["shiyu", "assault"]);
    expect(new URL(zzz[1]!.url).searchParams.get("uid")).toBe("1300000001");
    expect(new URL(zzz[1]!.url).searchParams.get("region")).toBe("prod_gf_jp");
    expect(chronicleRequests("wuwa", "eu", "1")).toEqual([]);
  });

  it("reads each mode's result, and nothing when the cycle has no run", () => {
    expect(readChronicle("abyss", ok({ schedule_id: 90, total_star: 36, max_floor: "12-3", total_battle_times: 12, is_unlock: true }), now)).toEqual({ result: 36, detail: "floor 12-3" });
    expect(readChronicle("abyss", ok({ schedule_id: 90, total_star: 0, max_floor: "0-0", total_battle_times: 0, is_unlock: true }), now)).toBeNull();
    const theater = ok({
      is_unlock: true,
      data: [
        { has_data: true, stat: { max_round_id: 8 }, schedule: { start_time: unix("2026-09-01T04:00:00Z"), end_time: unix("2026-10-01T04:00:00Z") } },
        { has_data: true, stat: { max_round_id: 10 }, schedule: { start_time: unix("2026-10-01T04:00:00Z"), end_time: unix("2026-11-01T04:00:00Z") } },
      ],
    });
    expect(readChronicle("theater", theater, now)).toEqual({ result: 10 });
    expect(readChronicle("moc", ok({ has_data: true, star_num: 30, max_floor: "Memory of Chaos Stage 12" }), now)).toEqual({ result: 30, detail: "Memory of Chaos Stage 12" });
    expect(readChronicle("pf", ok({ has_data: false, star_num: 0, max_floor: "" }), now)).toBeNull();
    expect(readChronicle("shiyu", ok({ hadal_ver: "v1", hadal_info_v1: { has_data: true, rating_list: [{ times: 4, rating: "S" }, { times: 1, rating: "A" }] } }), now)).toEqual({ result: 4 });
    expect(readChronicle("assault", ok({ has_data: true, total_star: 7, total_score: 52000 }), now)).toEqual({ result: 7, detail: "52000 points" });
    // Stygian Onslaught (genshin.py's HardChallenge): the season running now, its best solo difficulty and time.
    const stygian = ok({
      data: [
        { schedule: { is_valid: true, start_time: unix("2026-08-26T04:00:00Z"), end_time: unix("2026-09-29T04:00:00Z") }, single: { has_data: true, best: { difficulty: 4, second: 300 } } },
        { schedule: { is_valid: true, start_time: unix("2026-09-30T04:00:00Z"), end_time: unix("2026-11-03T04:00:00Z") }, single: { has_data: true, best: { difficulty: 5, second: 212 } } },
      ],
    });
    expect(readChronicle("stygian", stygian, now)).toEqual({ result: 5, detail: "212 s" });
    expect(readChronicle("stygian", ok({ data: [{ schedule: { is_valid: true, start_time: unix("2026-09-30T04:00:00Z"), end_time: unix("2026-11-03T04:00:00Z") }, single: { has_data: false, best: null } }] }), now)).toBeNull();
  });

  it("names a refusal", () => {
    expect(readChronicle("abyss", { retcode: 10102, message: "Data is not public", data: null }, now)).toEqual({ error: "not_public" });
  });
});
