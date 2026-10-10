import { describe, expect, it } from "vitest";
import { getGame, readEffects, rewardOptions, rosterTag, type RosterState } from "@gacha/shared";

const genshin = getGame("genshin")!;
const wuwa = getGame("wuwa")!;

const rainbow = readEffects(
  [
    { kind: "currency.add", currency: "primogems", amount: 420 },
    {
      kind: "choose",
      options: [
        { label: "Diona", effects: [{ kind: "unit.copy", unit: "character", catalogId: "diona", count: 1 }] },
        { label: "Chongyun", effects: [{ kind: "unit.copy", unit: "character", catalogId: "chongyun", count: 1 }] },
        { label: "Lisa", effects: [{ kind: "unit.copy", unit: "character", catalogId: "lisa", count: 1 }] },
      ],
    },
    { kind: "goal.create", title: "Stages", stages: ["1", "2"] },
    { kind: "note", text: "A namecard" },
  ],
  genshin,
);

const state: RosterState = {
  dupes: new Map([
    ["character:diona", 2],
    ["character:lisa", 6],
  ]),
  owned: new Set(["character:diona", "character:lisa", "character:chongyun"]),
  names: new Map([
    ["diona", "Diona"],
    ["chongyun", "Chongyun"],
    ["lisa", "Lisa"],
    ["favonius", "Favonius Sword"],
  ]),
};

describe("rewardOptions", () => {
  it("lists one option per choice with the step each unit takes, in the game's letter", () => {
    const { options, others } = rewardOptions(rainbow, genshin, state);
    expect(options.map((o) => [o.label, o.changes.map((c) => `${c.name} ${c.letter}${c.from} → ${c.letter}${c.to}`)])).toEqual([
      ["Diona", ["Diona C2 → C3"]],
      ["Chongyun", ["Chongyun C0 → C1"]],
      ["Lisa", ["Lisa C6 → C6"]],
    ]);
    expect(others).toEqual(["420 Primogems", "A namecard"]);
  });

  it("shows a unit you lack as new, and a weapon at its first step", () => {
    const fx = readEffects(
      [
        { kind: "unit.copy", unit: "character", catalogId: "amber", count: 2 },
        { kind: "unit.grant", unit: "weapon", catalogId: "favonius" },
      ],
      genshin,
    );
    const [only] = rewardOptions(fx, genshin, state).options;
    expect(only!.label).toBeNull();
    expect(only!.changes.map((c) => [c.name, c.from, c.to])).toEqual([
      ["amber", null, 1],
      ["Favonius Sword", null, 1],
    ]);
  });

  it("has no options when nothing changes the roster", () => {
    expect(rewardOptions(readEffects([{ kind: "currency.add", currency: "primogems", amount: 60 }], genshin), genshin, state).options).toEqual([]);
  });
});

describe("rosterTag", () => {
  it("tags a reward that changes the roster: +1 C for a character copy, +1 R for a weapon's, the game's letter elsewhere", () => {
    expect(rosterTag(rainbow, genshin)).toBe("+1 C");
    expect(rosterTag(readEffects([{ kind: "unit.copy", unit: "weapon", catalogId: "x", count: 1 }], genshin), genshin)).toBe("+1 R");
    expect(rosterTag(readEffects([{ kind: "unit.copy", unit: "character", catalogId: "x", count: 1 }], wuwa), wuwa)).toBe("+1 S");
    expect(rosterTag(readEffects([{ kind: "note", text: "x" }], genshin), genshin)).toBeNull();
  });
});
