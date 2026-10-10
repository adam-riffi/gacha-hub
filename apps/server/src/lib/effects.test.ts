import { describe, expect, it } from "vitest";
import { getGame, pickEffects, readEffects, type Effect } from "@gacha/shared";

const genshin = getGame("genshin")!;
const endfield = getGame("endfield")!;

const rainbow = {
  kind: "choose",
  options: [
    { label: "Diona", effects: [{ kind: "unit.copy", unit: "character", catalogId: "diona", count: 1 }] },
    { label: "Lisa", effects: [{ kind: "unit.copy", unit: "character", catalogId: "lisa", count: 1 }] },
  ],
};

describe("readEffects", () => {
  it("keeps every known kind as written", () => {
    const raw = [
      { kind: "unit.grant", unit: "weapon", catalogId: "favonius-sword" },
      { kind: "unit.copy", unit: "weapon", catalogId: "favonius-sword", count: 1 },
      { kind: "currency.add", currency: "primogems", amount: 420 },
      { kind: "material.add", materialId: "hero-s-wit", amount: 10 },
      { kind: "goal.create", title: "Clear the event stages", stages: ["Stage 1", "Stage 2"] },
      { kind: "note", text: "A namecard" },
      rainbow,
    ];
    expect(readEffects(raw, genshin)).toEqual(raw);
  });

  it("turns an unknown kind or a malformed effect into a note, and keeps the rest", () => {
    const out = readEffects([{ kind: "skin.grant", catalogId: "x" }, { kind: "currency.add", currency: "primogems" }, { kind: "note", text: "ok" }], genshin);
    expect(out.map((e) => e.kind)).toEqual(["note", "note", "note"]);
    expect(out[0]).toEqual({ kind: "note", text: "Unknown reward: skin.grant" });
    expect(out[2]).toEqual({ kind: "note", text: "ok" });
  });

  it("turns what the game does not support into a note: an unknown currency, a weapon copy where weapons have no dupes", () => {
    const out = readEffects(
      [
        { kind: "currency.add", currency: "gold-bars", amount: 5 },
        { kind: "unit.copy", unit: "weapon", catalogId: "w", count: 1 },
      ],
      endfield,
    );
    expect(out).toEqual([
      { kind: "note", text: "Unknown reward: currency.add gold-bars" },
      { kind: "note", text: "Unknown reward: unit.copy weapon" },
    ]);
  });

  it("degrades inside a choice too, and reads a non-list as nothing", () => {
    const out = readEffects([{ ...rainbow, options: [rainbow.options[0], { label: "Odd", effects: [{ kind: "teleport" }] }] }], genshin);
    expect(out[0]).toEqual({ ...rainbow, options: [rainbow.options[0], { label: "Odd", effects: [{ kind: "note", text: "Unknown reward: teleport" }] }] });
    expect(readEffects(null, genshin)).toEqual([]);
    expect(readEffects({ kind: "note", text: "x" }, genshin)).toEqual([]);
  });
});

describe("pickEffects", () => {
  const effects = readEffects([{ kind: "currency.add", currency: "primogems", amount: 60 }, rainbow], genshin) as Effect[];

  it("keys each effect by its place, so applying twice finds the same keys", () => {
    expect(pickEffects(effects, 1)).toEqual([
      { key: "0", effect: { kind: "currency.add", currency: "primogems", amount: 60 } },
      { key: "1.1.0", effect: { kind: "unit.copy", unit: "character", catalogId: "lisa", count: 1 } },
    ]);
  });

  it("needs a choice when the event offers one, and refuses one out of range", () => {
    expect(pickEffects(effects, undefined)).toBeNull();
    expect(pickEffects(effects, 2)).toBeNull();
    expect(pickEffects(effects.slice(0, 1), undefined)).toHaveLength(1);
  });
});
