import { describe, expect, it } from "vitest";
import { getGame, parseUigf, toUigf } from "@gacha/shared";

const genshin = getGame("genshin")!;
const info = { export_timestamp: 1791600000, export_app: "Some App", export_app_version: "1.0", version: "v4.2" };
const row = (id: string, gacha_type: string, time: string, rank_type: string, item_id: string) => ({ uigf_gacha_type: gacha_type === "400" ? "301" : gacha_type, gacha_type, item_id, count: "1", time, name: "x", item_type: "Character", rank_type, id });

describe("UIGF v4.2 (ADR 0005)", () => {
  it("reads the game's accounts, with times in the account's timezone", () => {
    const doc = { info, hk4e: [{ uid: 700000001, timezone: 8, lang: "en-us", list: [row("1700000000000000001", "301", "2026-09-02 18:00:00", "5", "10000106"), row("1700000000000000002", "400", "2026-09-02 18:00:01", "3", "11301")] }], hkrpg: [{ uid: "800000001", timezone: 8, list: [] }] };
    const accounts = parseUigf(doc, genshin);
    expect(accounts).toEqual([
      {
        uid: "700000001",
        timezone: 8,
        records: [
          { id: "1700000000000000001", gachaType: "301", time: new Date("2026-09-02T10:00:00Z"), rank: 5, itemId: "10000106" },
          { id: "1700000000000000002", gachaType: "400", time: new Date("2026-09-02T10:00:01Z"), rank: 3, itemId: "11301" },
        ],
      },
    ]);
    expect(parseUigf({ info }, genshin)).toEqual([]);
  });

  it("refuses what it cannot read: another version, a record without its rank, a malformed time or id", () => {
    const one = (r: object, version = "v4.2") => () => parseUigf({ info: { ...info, version }, hk4e: [{ uid: "1", timezone: 8, list: [{ ...row("1", "301", "2026-09-02 18:00:00", "5", "1"), ...r }] }] }, genshin);
    expect(one({}, "v3.0")).toThrow();
    expect(one({ rank_type: undefined })).toThrow();
    expect(one({ time: "2026-09-02T18:00:00Z" })).toThrow();
    expect(one({ id: "17e3" })).toThrow();
  });

  it("writes a profile's imported pulls back as UIGF v4.2, which reads back the same", () => {
    const pulls = [
      { recordId: "1700000000000000001", createdAt: new Date("2026-09-02T10:00:00.000Z"), record: { gachaType: "301", itemId: "10000106", rank: 5 } },
      { recordId: "1700000000000000002", createdAt: new Date("2026-09-02T10:00:01.001Z"), record: { gachaType: "400", itemId: "11301", rank: 3 } },
    ];
    const doc = toUigf(genshin, { uid: "700000001", timezone: 1 }, pulls, new Date("2026-10-10T12:00:00Z"));
    expect(doc.info).toMatchObject({ version: "v4.2", export_app: "Gacha Hub", export_timestamp: 1791633600 });
    expect(doc.hk4e![0]!.list[1]).toEqual({ uigf_gacha_type: "301", gacha_type: "400", item_id: "11301", count: "1", time: "2026-09-02 11:00:01", rank_type: "3", id: "1700000000000000002" });
    expect(parseUigf(doc, genshin)[0]!.records.map((r) => r.time.toISOString())).toEqual(["2026-09-02T10:00:00.000Z", "2026-09-02T10:00:01.000Z"]);
  });
});
