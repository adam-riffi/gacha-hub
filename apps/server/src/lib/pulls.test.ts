import { describe, expect, it } from "vitest";
import { pullsFor } from "@gacha/shared";

describe("pullsFor", () => {
  it("counts limited pulls, and keeps standard-only and weapon-only tickets apart (Endfield's Arsenal Tickets)", () => {
    expect(
      pullsFor([
        { value: 5000, pullCost: 500, pullLabel: "headhunt" },
        { value: 3960, pullCost: 198, pullLabel: "pull", weaponOnly: true },
        { value: 3, pullCost: 1, pullLabel: "wish", standardOnly: true },
        { value: 99 },
      ]),
    ).toEqual({ limited: 10, standard: 3, weapon: 20, label: "headhunt" });
  });
});
