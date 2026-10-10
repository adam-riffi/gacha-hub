import { describe, expect, it } from "vitest";
import { getGame, pullsFromRecords, type PullRecord } from "@gacha/shared";

const genshin = getGame("genshin")!;
const at = (s: string) => new Date(s);
const rec = (id: string, gachaType: string, time: string, rank = 3, itemId?: string): PullRecord => ({ id, gachaType, time: at(time), rank, itemId });

describe("pullsFromRecords (ADR 0005)", () => {
  it("files each record under the banner whose pity its gacha type feeds, and skips the rest", () => {
    const { pulls, skipped } = pullsFromRecords(genshin, [rec("1", "301", "2026-09-01T10:00:00Z"), rec("2", "400", "2026-09-01T10:01:00Z"), rec("3", "302", "2026-09-01T10:02:00Z"), rec("4", "200", "2026-09-01T10:03:00Z"), rec("5", "100", "2026-09-01T10:04:00Z"), rec("6", "999", "2026-09-01T10:05:00Z")], []);
    expect(pulls.map((p) => [p.recordId, p.bannerKey])).toEqual([["1", "character"], ["2", "character"], ["3", "weapon"], ["4", "standard"], ["5", "beginner"]]);
    expect(skipped).toBe(1);
  });

  it("orders records by time then id, and keeps a 10-pull's order a millisecond apart", () => {
    const same = "2026-09-01T10:00:00Z";
    const { pulls } = pullsFromRecords(genshin, [rec("1700000000000000012", "301", same), rec("1700000000000000003", "301", "2026-08-31T09:00:00Z"), rec("1700000000000000011", "301", same)], []);
    expect(pulls.map((p) => p.recordId)).toEqual(["1700000000000000003", "1700000000000000011", "1700000000000000012"]);
    expect(pulls.map((p) => p.createdAt.toISOString())).toEqual(["2026-08-31T09:00:00.000Z", "2026-09-01T10:00:00.000Z", "2026-09-01T10:00:00.001Z"]);
  });

  it("calls a 5★ featured when a banner of its kind running then features it, lost when none does, unknown with no banner on record", () => {
    const windows = [{ kind: "character", startsAt: at("2026-09-01T00:00:00Z"), endsAt: at("2026-09-20T00:00:00Z"), featured: [{ catalogId: "10000096" }] }];
    const { pulls } = pullsFromRecords(
      genshin,
      [rec("1", "301", "2026-09-02T10:00:00Z", 5, "10000096"), rec("2", "301", "2026-09-03T10:00:00Z", 5, "10000042"), rec("3", "301", "2026-10-02T10:00:00Z", 5, "10000096"), rec("4", "200", "2026-09-02T10:00:00Z", 5, "10000042"), rec("5", "301", "2026-09-02T11:00:00Z", 4, "10000021")],
      windows,
    );
    expect(pulls.map((p) => [p.recordId, p.fiveStar, p.featured, p.catalogId])).toEqual([
      ["1", true, true, "10000096"],
      ["4", true, null, "10000042"],
      ["5", false, null, "10000021"],
      ["2", true, false, "10000042"],
      ["3", true, null, "10000096"],
    ]);
  });
});
