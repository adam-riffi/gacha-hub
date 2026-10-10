import { describe, expect, it } from "vitest";
import { elementColor, gameList } from "@gacha/shared";

/** The hue of a #rrggbb colour, in degrees. */
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
/** Relative luminance (WCAG). */
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

describe("element colours, as each game paints them (Georges, 2026-10-11)", () => {
  it("follows the game: Endfield's Electric is yellow, Genshin's Electro purple, ZZZ's Electric blue and its Physical yellow", () => {
    expect(hue(elementColor("endfield", "Electric")!)).toBeGreaterThan(40);
    expect(hue(elementColor("endfield", "Electric")!)).toBeLessThan(60);
    expect(hue(elementColor("genshin", "Electro")!)).toBeGreaterThan(260);
    expect(hue(elementColor("genshin", "Electro")!)).toBeLessThan(300);
    expect(hue(elementColor("zzz", "Electric")!)).toBeGreaterThan(200);
    expect(hue(elementColor("zzz", "Electric")!)).toBeLessThan(230);
    expect(hue(elementColor("zzz", "Physical")!)).toBeGreaterThan(35);
    expect(hue(elementColor("zzz", "Physical")!)).toBeLessThan(55);
  });

  it("colours every element of every catalog, light enough for dark text", async () => {
    for (const game of gameList.filter((g) => g.loadCatalog)) {
      const catalog = await game.loadCatalog!();
      for (const tag of new Set(catalog.characters.map((c) => c.tag).filter((t): t is string => Boolean(t) && t !== "None"))) {
        const colour = elementColor(game.key, tag);
        expect(colour, `${game.key}/${tag}`).toMatch(/^#[0-9a-f]{6}$/);
        // Black text on it keeps 4.5:1 (WCAG AA).
        expect((luminance(colour!) + 0.05) / 0.05, `${game.key}/${tag}`).toBeGreaterThan(4.5);
      }
    }
  });
});
