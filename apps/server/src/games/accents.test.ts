import { describe, expect, it } from "vitest";
import { getGame } from "@gacha/shared";

// One accent per scope (VISUAL-DESIGN.md §3, ADR 0007); the shell reads it from the module.
const ACCENTS: Record<string, string> = {
  genshin: "#FFAA33",
  hsr: "#FF8FD1",
  zzz: "#8CFF3A",
  wuwa: "#2EE6C8",
  endfield: "#FFE600",
};

describe("game accents", () => {
  it.each(Object.entries(ACCENTS))("%s uses its VISUAL-DESIGN.md colour", (key, accent) => {
    expect(getGame(key)?.accent.toUpperCase()).toBe(accent);
  });
});
