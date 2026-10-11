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

  it("gives Star Rail's characters their skills' short descriptions, without colour tags", async () => {
    const cat = await getGame("hsr")!.loadCatalog!();
    const withInfo = cat.characters.filter((c) => (c.talents.info?.length ?? 0) > 0);
    expect(withInfo.every((c) => c.talents.info!.every((t) => (t.description ?? "").length > 10 && !/<\/?color/.test(t.description!)))).toBe(true);
    const wolf = cat.characters.find((c) => c.name === "Silver Wolf")!;
    expect(wolf.talents.info!.find((t) => t.key === "skill")!.description).toContain("apply additional Weakness");
  });

  it("gives WuWa's resonators their skills' short descriptions, numbers filled in and without tags", async () => {
    const cat = await getGame("wuwa")!.loadCatalog!();
    const withInfo = cat.characters.filter((c) => (c.talents.info?.length ?? 0) > 0);
    expect(withInfo.length).toBeGreaterThan(30);
    expect(withInfo.every((c) => c.talents.info!.every((t) => (t.description ?? "").length > 10 && !/[<{]/.test(t.description!)))).toBe(true);
    const yangyang = cat.characters.find((c) => c.name === "Yangyang")!;
    expect(yangyang.talents.info!.find((t) => t.key === "forte")!.description).toContain("Yangyang can hold up to 3 Melodies.");
  });
});
