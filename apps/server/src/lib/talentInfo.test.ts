import { describe, expect, it } from "vitest";
import { getGame } from "@gacha/shared";

// Talent and skill descriptions (Georges, 2026-10-11: "for later, add game data such as talent / skill descriptions").
describe("talent descriptions in the catalogs", () => {
  it("gives every Genshin character's three combat talents their description", async () => {
    const cat = await getGame("genshin")!.loadCatalog!();
    const withTalents = cat.characters.filter((c) => (c.talents.info?.length ?? 0) === 3);
    expect(withTalents.length).toBeGreaterThan(80);
    expect(withTalents.every((c) => c.talents.info!.every((t) => (t.description ?? "").length > 20))).toBe(true);
    const barbara = cat.characters.find((c) => c.name === "Barbara")!;
    expect(barbara.talents.info!.find((t) => t.key === "skill")!.description).toContain("Melody Loop");
  });
});
