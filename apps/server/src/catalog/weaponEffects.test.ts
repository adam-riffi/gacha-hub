import { describe, expect, it } from "vitest";
import { catalogSchema, genshin, hsr, nte, wuwa, zzz } from "@gacha/shared";

const load = async (game: typeof genshin) => catalogSchema.parse(await game.loadCatalog!());

// Georges, round 7: "a window with all of my weapons in big … and an info i that I can click on to read the effect".
// Each catalog keeps each weapon's effect, its name and its text at every refinement (R1 to R5, S1 to S5…).
describe("weapon effects", () => {
  it("Genshin: Mistsplitter Reforged, 12% at R1 and 24% at R5 (genshin-db)", async () => {
    const w = (await load(genshin)).weapons.find((x) => x.name === "Mistsplitter Reforged")!;
    expect(w.effect?.name).toBe("Mistsplitter's Edge");
    expect(w.effect?.ranks).toHaveLength(5);
    expect(w.effect?.ranks[0]).toMatch(/^Gain a 12% Elemental DMG Bonus/);
    expect(w.effect?.ranks[4]).toMatch(/^Gain a 24% Elemental DMG Bonus/);
  });

  it("Star Rail: Patience Is All You Need, 24% at S1 and 40% at S5, without markup", async () => {
    const w = (await load(hsr)).weapons.find((x) => x.name === "Patience Is All You Need")!;
    expect(w.effect?.name).toBe("Spider Web");
    expect(w.effect?.ranks[0]).toMatch(/^Increases DMG dealt by the wearer by 24%\. .*SPD increases by 4\.8%/);
    expect(w.effect?.ranks[4]).toMatch(/^Increases DMG dealt by the wearer by 40%/);
    expect(w.effect?.ranks.join(" ")).not.toMatch(/<|#\d|\\n/);
  });

  it("ZZZ: Steel Cushion, 20% at P1 and 40% at P5", async () => {
    const w = (await load(zzz)).weapons.find((x) => x.name === "Steel Cushion")!;
    expect(w.effect?.name).toBe("Metal Cat Claws");
    expect(w.effect?.ranks[0]).toBe("Increases Physical DMG by 20%. The equipper's DMG increases by 25% when hitting the enemy from behind.");
    expect(w.effect?.ranks[4]).toMatch(/by 40%.*by 50%/);
  });

  it("Wuthering Waves: Autumntrace, 4% at R1 and 12.8% at R5", async () => {
    const w = (await load(wuwa)).weapons.find((x) => x.name === "Autumntrace")!;
    expect(w.effect?.ranks[0]).toMatch(/^Increases ATK by 4% upon dealing Basic Attack DMG or Heavy Attack DMG, stacking up to 5 time\(s\)/);
    expect(w.effect?.ranks[4]).toMatch(/^Increases ATK by 12\.8%/);
  });

  it("NTE: Good Boy's Grand Adventure, 18% at the first rank and 30% at the fifth", async () => {
    const w = (await load(nte)).weapons.find((x) => x.name === "Good Boy's Grand Adventure")!;
    expect(w.effect?.name).toBe("Morphix");
    expect(w.effect?.ranks[0]).toMatch(/^Increases Charge Efficiency by 18%\./);
    expect(w.effect?.ranks[4]).toMatch(/^Increases Charge Efficiency by 30%\./);
  });

  it("every 4★ and 5★ weapon of those games has its effect at five ranks", async () => {
    for (const game of [genshin, hsr, zzz, wuwa, nte]) {
      const missing = (await load(game)).weapons.filter((w) => w.rarity >= 4 && w.effect?.ranks.length !== 5).map((w) => w.name);
      expect(missing, game.key).toEqual([]);
    }
  });
});
