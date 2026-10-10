import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hoyolabNotesUrl, readRecordCards } from "@gacha/shared";
import { dsHeader } from "./hoyolab.js";

describe("HoYoLAB (ADR 0005)", () => {
  it("signs a request as HoYoLAB's overseas web client does", () => {
    const md5 = createHash("md5").update("salt=6s25p5ox5y14umn1p61aqyyvbvvl3lrt&t=1791633600&r=abcdef").digest("hex");
    expect(dsHeader(1791633600, "abcdef")).toBe(`1791633600,abcdef,${md5}`);
  });

  it("reads which of our games the account plays, and names the errors", () => {
    const cards = { retcode: 0, message: "OK", data: { list: [
      { game_id: 2, game_role_id: "700000001", region: "os_euro", level: 58, nickname: "Traveler" },
      { game_id: 1, game_role_id: "10000001", region: "eur01", level: 88, nickname: "Captain" },
      { game_id: 6, game_role_id: "800000001", region: "prod_official_eur", level: 70, nickname: "Trailblazer" },
      { game_id: 8, game_role_id: "1500000001", region: "prod_gf_eu", level: 60, nickname: "Proxy" },
    ] } };
    expect(readRecordCards(cards)).toEqual({ games: [
      { gameKey: "genshin", uid: "700000001", level: 58, regionKey: "eu" },
      { gameKey: "hsr", uid: "800000001", level: 70, regionKey: "eu" },
      { gameKey: "zzz", uid: "1500000001", level: 60, regionKey: "eu" },
    ] });
    expect(readRecordCards({ retcode: -100, message: "Please login", data: null })).toEqual({ games: [], error: "not_logged_in" });
    // A card's stats (genshin.py's RecordCardData) are the profile's long-term progress.
    const withStats = { retcode: 0, message: "OK", data: { list: [{ game_id: 2, game_role_id: "700000001", region: "os_euro", level: 58, data: [{ name: "Days Active", type: 1, value: "512" }, { name: "Achievements", type: 1, value: "870" }, { name: "", type: 1, value: "x" }] }] } };
    expect(readRecordCards(withStats).games[0]!.stats).toEqual([{ name: "Days Active", value: "512" }, { name: "Achievements", value: "870" }]);
    expect(readRecordCards({ retcode: 10001, message: "Please login", data: null })).toEqual({ games: [], error: "not_logged_in" });
    expect(readRecordCards({ retcode: 10102, message: "Data is not public", data: null })).toEqual({ games: [], error: "not_public" });
    expect(readRecordCards("<html>")).toEqual({ games: [], error: "refused" });
  });

  it("asks each game's real-time notes on its own host and server", () => {
    expect(hoyolabNotesUrl("genshin", "eu", "700000001")).toBe("https://sg-public-api.hoyolab.com/event/game_record/genshin/api/dailyNote?server=os_euro&role_id=700000001");
    expect(hoyolabNotesUrl("hsr", "na", "600000001")).toBe("https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/note?server=prod_official_usa&role_id=600000001");
    expect(hoyolabNotesUrl("zzz", "asia", "1300000001")).toBe("https://sg-act-public-api.hoyolab.com/event/game_record_zzz/api/zzz/note?server=prod_gf_jp&role_id=1300000001");
    expect(hoyolabNotesUrl("wuwa", "eu", "1")).toBeNull();
  });
});
