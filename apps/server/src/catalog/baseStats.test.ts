import { describe, expect, it } from "vitest";
import { baseStatsAt, catalogSchema, genshin, hsr, zzz } from "@gacha/shared";

const load = async (game: typeof genshin) => catalogSchema.parse(await game.loadCatalog!());
const close = (got: Record<string, number> | null, want: Record<string, number>) => {
  expect(got).not.toBeNull();
  for (const [k, v] of Object.entries(want)) expect(got![k], k).toBeCloseTo(v, 0);
};

// Georges, round 6: "base stats should be auto included for everything: characters, weapons, gear". Each catalog keeps
// each character's and weapon's base stats at the ends of every ascension phase; between them they are read on the line.
describe("base stats", () => {
  it("Genshin: Barbara at 80, 80 ascended and 90; Mistsplitter at 90 (genshin-db)", async () => {
    const c = await load(genshin);
    const barbara = c.characters.find((x) => x.id === "10000014")!;
    close(baseStatsAt(barbara, 80), { HP: 8674.02, ATK: 141.18, DEF: 592.78, "HP%": 18 });
    close(baseStatsAt(barbara, 80, true), { HP: 9109.6, ATK: 148.27, DEF: 622.55, "HP%": 24 });
    close(baseStatsAt(barbara, 90), { HP: 9787.42, ATK: 159.3, DEF: 668.87, "HP%": 24 });
    close(baseStatsAt(c.weapons.find((w) => w.name === "Mistsplitter Reforged")!, 90), { ATK: 674.33, "CRIT DMG": 44.1 });
    expect(c.characters.filter((x) => x.baseStats).length).toBeGreaterThanOrEqual(90);
  });

  it("Star Rail: Kafka and Arrows at 80, a level in between on its line", async () => {
    const c = await load(hsr);
    const kafka = c.characters.find((x) => x.id === "1005")!;
    close(baseStatsAt(kafka, 80), { HP: 1086.62, ATK: 679.14, DEF: 485.1, SPD: 100 });
    // Lv 75: the 70→80 phase's base and its growth per level.
    close(baseStatsAt(kafka, 75), { HP: 502.66 + 7.392 * 74, ATK: 314.16 + 4.62 * 74 });
    close(baseStatsAt(c.weapons.find((w) => w.id === "20000")!, 80), { HP: 846.72, ATK: 317.52, DEF: 264.6 });
  });

  it("ZZZ: Ellen at 60 without her core skill; Steel Cushion at 60", async () => {
    const c = await load(zzz);
    // The game shows them floored: 7673 HP, 606 DEF, and 938 ATK with the core skill's 75.
    close(baseStatsAt(c.characters.find((x) => x.name === "Ellen")!, 60), { HP: 7673.7, DEF: 606.6, ATK: 863.21 });
    close(baseStatsAt(c.weapons.find((w) => w.name === "Steel Cushion")!, 60), { ATK: 684, "CRIT Rate": 24 });
  });

  it("reads nothing for a unit without them", () => {
    expect(baseStatsAt({}, 50)).toBeNull();
  });
});
