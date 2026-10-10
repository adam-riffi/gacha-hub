import { describe, expect, it } from "vitest";
import { readNotes } from "@gacha/shared";

const ok = (data: object) => ({ retcode: 0, message: "OK", data });

describe("real-time notes (ADR 0005)", () => {
  it("reads Genshin's resin, and its commissions done once their reward is taken", () => {
    const note = { current_resin: 120, max_resin: 200, finished_task_num: 4, total_task_num: 4, is_extra_task_reward_received: true };
    expect(readNotes("genshin", ok(note))).toEqual({ currencies: { resin: 120 }, dailyDone: true });
    expect(readNotes("genshin", ok({ ...note, is_extra_task_reward_received: false }))).toEqual({ currencies: { resin: 120 }, dailyDone: false });
  });

  it("reads Star Rail's power and reserve, and its daily training", () => {
    expect(readNotes("hsr", ok({ current_stamina: 180, max_stamina: 300, current_reserve_stamina: 1000, current_train_score: 500, max_train_score: 500 }))).toEqual({
      currencies: { trailblazePower: 180, reservedTrailblazePower: 1000 },
      dailyDone: true,
    });
  });

  it("reads ZZZ's battery, and its daily missions by vitality", () => {
    expect(readNotes("zzz", ok({ energy: { progress: { max: 240, current: 100 } }, vitality: { max: 400, current: 300 } }))).toEqual({ currencies: { battery: 100 }, dailyDone: false });
  });

  it("names a refused answer", () => {
    expect(readNotes("genshin", { retcode: -100, message: "Please login", data: null })).toEqual({ error: "not_logged_in" });
    expect(readNotes("genshin", { retcode: 10102, message: "Data is not public", data: null })).toEqual({ error: "not_public" });
  });
});
