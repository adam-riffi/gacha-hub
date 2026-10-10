import { describe, expect, it } from "vitest";
import { farmToday, type FarmGoal } from "@gacha/shared";

const books = { name: "Teachings of Freedom", category: "Character Talent Material", availability: [1, 4, 7] };
const weaponMat = { name: "Tile of Decarabian's Tower", category: "Weapon Ascension Material", availability: [1, 4, 7] };
const fridayBooks = { name: "Teachings of Ballad", category: "Character Talent Material", availability: [3, 6, 7] };
const anyDay = { name: "Hurricane Seed", category: "Character Ascension Material" };

const goal = (owner: string, materials: FarmGoal["materials"]): FarmGoal => ({ owner, materials });

describe("farmToday (WIREFRAMES.md A3)", () => {
  it("lists rotating materials open on the game day, per goal, with their days", () => {
    const lines = farmToday(
      [
        goal("Venti", [
          { material: books, missing: 9 },
          { material: anyDay, missing: 4 },
        ]),
        goal("Amber", [{ material: fridayBooks, missing: 3 }]),
      ],
      1,
    );
    expect(lines).toEqual([
      { kind: "domain", text: "talent books (Mon/Thu) for Venti" },
      { kind: "anyday", text: "materials for Venti (any day)" },
    ]);
  });

  it("leaves out what is already covered, and names weapon materials", () => {
    expect(farmToday([goal("Venti", [{ material: books, missing: 0 }]), goal("The Catch", [{ material: weaponMat, missing: 2 }])], 4)).toEqual([
      { kind: "domain", text: "weapon materials (Mon/Thu) for The Catch" },
    ]);
  });

  it("is open every day on Sunday", () => {
    expect(farmToday([goal("Amber", [{ material: fridayBooks, missing: 3 }])], 7)).toEqual([{ kind: "domain", text: "talent books (Wed/Sat) for Amber" }]);
  });
});
