import { describe, expect, it } from "vitest";
import { getGame, readRoster, rosterRequest } from "@gacha/shared";

const ok = (data: object) => ({ retcode: 0, message: "OK", data });

describe("the chronicle's roster (ADR 0005)", () => {
  it("asks each game's character list as its client does", () => {
    expect(rosterRequest("genshin", "eu", "700000001")).toEqual({
      url: "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/character/list",
      method: "POST",
      body: { role_id: "700000001", server: "os_euro" },
    });
    expect(rosterRequest("hsr", "eu", "800000001")).toEqual({
      url: "https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/avatar/info?server=prod_official_eur&role_id=800000001&need_wiki=true",
      method: "GET",
    });
    expect(rosterRequest("zzz", "eu", "1")).toBeNull();
  });

  it("reads each character's level and dupes, and the weapon it holds, in the build's own fields", () => {
    const genshin = ok({ list: [{ id: 10000021, level: 80, actived_constellation_num: 2, weapon: { id: 15301, level: 90, affix_level: 5 } }] });
    expect(readRoster(getGame("genshin")!, genshin)).toEqual({
      units: [{ catalogId: "10000021", weaponId: "15301", doc: { level: 80, constellation: 2, weapon: { catalogId: "15301", level: 90, refinement: 5 } } }],
    });
    const hsr = ok({ avatar_list: [{ id: 1005, level: 80, rank: 1, equip: { id: 23006, level: 80, rank: 2 } }, { id: 1001, level: 20, rank: 6, equip: null }] });
    expect(readRoster(getGame("hsr")!, hsr)).toEqual({
      units: [
        { catalogId: "1005", weaponId: "23006", doc: { level: 80, eidolon: 1, lightCone: { catalogId: "23006", level: 80, superimposition: 2 } } },
        { catalogId: "1001", doc: { level: 20, eidolon: 6 } },
      ],
    });
    expect(readRoster(getGame("genshin")!, { retcode: 10102, message: "Data is not public", data: null })).toEqual({ units: [], error: "not_public" });
  });
});
