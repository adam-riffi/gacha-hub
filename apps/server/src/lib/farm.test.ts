import { describe, expect, it } from "vitest";
import { farmToday, type FarmGoal } from "@gacha/shared";

const books = { id: "books", name: "Teachings of Freedom", category: "Character Talent Material", availability: [1, 4, 7] };
const weaponMat = { id: "tile", name: "Tile of Decarabian's Tower", category: "Weapon Ascension Material", availability: [1, 4, 7] };
const fridayBooks = { id: "ballad", name: "Teachings of Ballad", category: "Character Talent Material", availability: [3, 6, 7] };
const anyDay = { id: "seed", name: "Hurricane Seed", category: "Character Ascension Material" };

// Each line also says, for the card's icons, who it is for, which materials and their days (Sunday, open to all, left out).
const goal = (owner: string, materials: FarmGoal["materials"], unit: FarmGoal["unit"] = null): FarmGoal => ({ owner, materials, unit });

describe("farmToday (WIREFRAMES.md A3)", () => {
  it("lists rotating materials open on the game day, per goal, with their days", () => {
    const lines = farmToday(
      [
        goal(
          "Venti",
          [
            { material: books, missing: 9 },
            { material: anyDay, missing: 4 },
          ],
          { kind: "character", catalogId: "10000022" },
        ),
        goal("Amber", [{ material: fridayBooks, missing: 3 }]),
      ],
      1,
    );
    expect(lines).toEqual([
      { kind: "domain", text: "talent books (Mon/Thu) for Venti", unit: { kind: "character", catalogId: "10000022" }, materials: ["books"], days: [1, 4] },
      { kind: "anyday", text: "materials for Venti (any day)", unit: { kind: "character", catalogId: "10000022" }, materials: ["seed"], days: [] },
    ]);
  });

  it("leaves out what is already covered, and names weapon materials", () => {
    expect(farmToday([goal("Venti", [{ material: books, missing: 0 }]), goal("The Catch", [{ material: weaponMat, missing: 2 }])], 4)).toEqual([
      { kind: "domain", text: "weapon materials (Mon/Thu) for The Catch", unit: null, materials: ["tile"], days: [1, 4] },
    ]);
  });

  it("is open every day on Sunday", () => {
    expect(farmToday([goal("Amber", [{ material: fridayBooks, missing: 3 }])], 7)).toEqual([{ kind: "domain", text: "talent books (Wed/Sat) for Amber", unit: null, materials: ["ballad"], days: [3, 6] }]);
  });
});
