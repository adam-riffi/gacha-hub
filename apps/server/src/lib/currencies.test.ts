import { describe, expect, it } from "vitest";
import { allCurrencies } from "./currencies.js";

describe("allCurrencies", () => {
  it("lists every defined currency in definition order, defaulting unset ones to 0", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const stored = new Date("2026-02-01T00:00:00Z");
    const out = allCurrencies(
      [{ key: "primogems", label: "Primogems" }, { key: "intertwinedFate", label: "Intertwined Fate" }],
      [
        { key: "primogems", value: 1600, updatedAt: stored },
        { key: "retired", value: 5, updatedAt: stored }, // no longer defined → dropped
      ],
      since,
    );
    expect(out).toEqual([
      { key: "primogems", value: 1600, updatedAt: stored },
      { key: "intertwinedFate", value: 0, updatedAt: since },
    ]);
  });
});
