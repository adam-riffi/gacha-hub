import { describe, expect, it } from "vitest";
import { buildKpis, buildLine, cardStatLabels, dupeBadge, gearSetLabel, getGame, statKind, statKpis } from "@gacha/shared";

const genshin = getGame("genshin")!;
const wuwa = getGame("wuwa")!;

const piece = (setName: string, substats: [string, number][]) => ({ setName, substats: substats.map(([stat, value]) => ({ stat, value })) });

describe("buildKpis (WIREFRAMES.md G4)", () => {
  const doc = {
    stats: { "CRIT Rate": 68.2, "CRIT DMG": 199.4, "Energy Recharge": 112.3, "Elemental Mastery": 812 },
    artifacts: {
      flower: piece("Whimsy", [["CRIT Rate", 10.5], ["CRIT DMG", 21]]),
      plume: piece("Whimsy", [["CRIT DMG", 14], ["ATK%", 5]]),
      sands: piece("Whimsy", [["CRIT Rate", 3.5]]),
      goblet: piece("Whimsy", []),
      circlet: piece("Gladiator", [["CRIT DMG", 7]]),
    },
  };

  it("shows the three KPIs of the build's role, crit value from its gear's substats", () => {
    expect(buildKpis(genshin, doc, "damage")).toEqual([
      { label: "Crit value", value: "70" },
      { label: "CRIT Rate / CRIT DMG", value: "68 / 199" },
      { label: "Energy Recharge", value: "112%" },
    ]);
    expect(buildKpis(genshin, doc, "support").map((k) => k.value)).toEqual(["112%", "812", "—"]);
  });

  it("falls back to the game's first role, and reads each game's own stat names", () => {
    expect(buildKpis(genshin, doc, null).map((k) => k.label)).toEqual(["Crit value", "CRIT Rate / CRIT DMG", "Energy Recharge"]);
    const w = { stats: { "Crit. Rate": 55, "Crit. DMG": 210, "Energy Regen": 125 } };
    expect(buildKpis(wuwa, w, "damage").map((k) => k.value)).toEqual(["—", "55 / 210", "125%"]);
  });
});

describe("gearSetLabel", () => {
  it("names the set bonuses the gear completes", () => {
    const four = { artifacts: { a: piece("Whimsy", []), b: piece("Whimsy", []), c: piece("Whimsy", []), d: piece("Whimsy", []), e: piece("Gladiator", []) } };
    expect(gearSetLabel(genshin, four)).toBe("Whimsy 4pc");
    const twoTwo = { artifacts: { a: piece("Whimsy", []), b: piece("Whimsy", []), c: piece("Gladiator", []), d: piece("Gladiator", []) } };
    expect(gearSetLabel(genshin, twoTwo)).toBe("Gladiator 2pc + Whimsy 2pc");
    expect(gearSetLabel(genshin, { artifacts: {} })).toBeNull();
  });
});

describe("buildLine and dupeBadge (the card's name box and badge)", () => {
  const hsr = getGame("hsr")!;
  it("reads the level, the skill levels in the catalog's order, and the weapon's dupes, in each game's words", () => {
    expect(buildLine(genshin, { level: 90, talents: { normal: 9, skill: 9, burst: 10 }, weapon: { refinement: 1 } }, ["normal", "skill", "burst"])).toBe("Lv 90 · talents 9/9/10 · R1");
    expect(buildLine(hsr, { level: 80, traces: { basic: 6, skill: 8 }, lightCone: { superimposition: 3 } }, ["basic", "skill"])).toBe("Lv 80 · traces 6/8 · S3");
    expect(buildLine(genshin, {}, ["normal", "skill", "burst"])).toBe("Lv — · talents 1/1/1");
  });
  it("shows the character's dupes as its badge", () => {
    expect(dupeBadge(genshin, { constellation: 2 })).toBe("C2");
    expect(dupeBadge(hsr, {})).toBe("E0");
  });
});

// The stats the cards show, picked (Georges, round 5), and a set's bonus on top: "include set bonuses like crit or atk
// bonus but with a highlight … when i hover on it or click on it it shows the original amount + the set bonus".
describe("statKpis and set bonuses", () => {
  const four = (setName: string, slots: string[]) => Object.fromEntries(slots.map((s) => [s, { setName, substats: [] }]));
  const ARTIFACTS = ["flower", "plume", "sands", "goblet"];
  const blizzard = { name: "Blizzard Strayer", bonuses: ["Cryo DMG Bonus +15%.", "When a character attacks an opponent affected by Cryo, their CRIT Rate is increased by 20%. If the opponent is Frozen, CRIT Rate is increased by an additional 20%."] };
  const sojourner = { name: "Resolution of Sojourner", bonuses: ["ATK +18%.", "Increases Charged Attack CRIT Rate by 30%."] };

  it("shows the picked stats as the sheet stores them", () => {
    expect(statKpis(genshin, { stats: { HP: 18000.4, "Elemental Mastery": 120, DEF: 900 } }, ["HP", "Elemental Mastery", "DEF"], [])).toEqual([
      { label: "HP", value: "18000" },
      { label: "Elemental Mastery", value: "120" },
      { label: "DEF", value: "900" },
    ]);
  });

  it("adds a completed set's top bonus to the stat it raises, keeping the stat and the bonus apart", () => {
    const doc = { stats: { "CRIT Rate": 50 }, artifacts: four("Blizzard Strayer", ARTIFACTS) };
    expect(statKpis(genshin, doc, ["CRIT Rate"], [blizzard])).toEqual([{ label: "CRIT Rate", value: "70%", base: "50%", bonus: { value: "20%", from: "Blizzard Strayer 4pc" } }]);
  });

  it("leaves out the 2-piece bonus (the character screen counts it already), an unfinished set, and a bonus to one kind of attack", () => {
    const two = { stats: { "CRIT Rate": 50 }, artifacts: four("Blizzard Strayer", ARTIFACTS.slice(0, 3)) };
    expect(statKpis(genshin, two, ["CRIT Rate"], [blizzard])).toEqual([{ label: "CRIT Rate", value: "50%" }]);
    const charged = { stats: { "CRIT Rate": 50, ATK: 2000 }, artifacts: four("Resolution of Sojourner", ARTIFACTS) };
    expect(statKpis(genshin, charged, ["CRIT Rate", "ATK"], [sojourner])).toEqual([
      { label: "CRIT Rate", value: "50%" },
      { label: "ATK", value: "2000" },
    ]);
  });

  it("shows a percentage bonus to a flat stat beside it: Musketeer's SPD, Woodpecker's ATK", () => {
    const hsr = getGame("hsr")!;
    const musketeer = { name: "Musketeer of Wild Wheat", bonuses: ["2pc: Increases ATK by 12%.", "4pc: The wearer's SPD increases by 6% and DMG dealt by Basic ATK increases by 10%."] };
    const doc = { stats: { SPD: 120 }, relics: four("Musketeer of Wild Wheat", ["head", "hands", "body", "feet"]) };
    expect(statKpis(hsr, doc, ["SPD"], [musketeer])).toEqual([{ label: "SPD", value: "120", base: "120", bonus: { value: "+6%", from: "Musketeer of Wild Wheat 4pc" } }]);
    const zzz = getGame("zzz")!;
    const woodpecker = { name: "Woodpecker Electro", bonuses: ["2pc: CRIT Rate +8%", "4pc: Landing a critical hit on an enemy with a Basic Attack, Dodge Counter, or EX Special Attack increases the equipper's ATK by 9% for 6s."] };
    const zdoc = { stats: { ATK: 2400 }, discs: four("Woodpecker Electro", ["slot1", "slot2", "slot3", "slot4"]) };
    expect(statKpis(zzz, zdoc, ["ATK"], [woodpecker])).toEqual([{ label: "ATK", value: "2400", base: "2400", bonus: { value: "+9%", from: "Woodpecker Electro 4pc" } }]);
  });

  it("reads WuWa's 5-piece bonus onto its DMG Bonus stat", () => {
    const frost = { name: "Freezing Frost", bonuses: ["2pc: Glacio DMG + 10%.", "5pc: Glacio DMG + 10% after releasing Basic Attack or Heavy Attack. This effect stacks up to 3 times, each stack lasts 15s."] };
    const doc = { stats: { "Glacio DMG Bonus": 30 }, echoes: four("Freezing Frost", ["slot1", "slot2", "slot3", "slot4", "slot5"]) };
    expect(statKpis(wuwa, doc, ["Glacio DMG Bonus"], [frost])).toEqual([{ label: "Glacio DMG Bonus", value: "40%", base: "30%", bonus: { value: "10%", from: "Freezing Frost 5pc" } }]);
  });
});

// Georges, round 7: "by default each character has its main stat showcased first".
describe("cardStatLabels", () => {
  const hsr = getGame("hsr")!;
  const kafka = { bonusStats: ["ATK", "Effect Hit Rate", "HP"] };
  // Georges, round 8: "character cards are too tall: just put a max of 3 displayed stats".
  it("puts the growth stat first, then the role's stats, up to three", () => {
    expect(cardStatLabels(hsr, kafka, null)).toEqual(["ATK", "Crit value", "CRIT Rate / CRIT DMG"]);
    expect(cardStatLabels(hsr, { bonusStats: ["SPD"] }, null)).toEqual(["SPD", "Crit value", "CRIT Rate / CRIT DMG"]);
    expect(cardStatLabels(hsr, undefined, "support")).toEqual(["SPD", "Energy Regeneration Rate", "Effect Hit Rate"]);
  });
  it("keeps the build's pick, else the game's", () => {
    expect(cardStatLabels(hsr, kafka, null, ["HP"], ["DEF"])).toEqual(["HP"]);
    expect(cardStatLabels(hsr, kafka, null, null, ["DEF"])).toEqual(["DEF"]);
    // A pick of more, saved before round 8, shows its first three.
    expect(cardStatLabels(hsr, kafka, null, ["HP", "ATK", "DEF", "SPD"])).toEqual(["HP", "ATK", "DEF"]);
  });
});

// Georges, round 7: "stat icons should also be used when possible".
describe("statKind", () => {
  it("names each game's stats by their kind, for their icon", () => {
    const kinds = Object.fromEntries(
      ["HP%", "Base ATK", "DEF", "CRIT Rate", "CRIT DMG", "Crit value", "Energy Regeneration Rate", "Elemental Mastery", "Anomaly Proficiency", "SPD", "Outgoing Healing Boost", "Effect Hit Rate", "Break Effect", "Impact", "PEN Ratio", "Ice DMG Boost", "Physical DMG Bonus"].map((n) => [n, statKind(n)]),
    );
    expect(kinds).toEqual({
      "HP%": "hp",
      "Base ATK": "atk",
      DEF: "def",
      "CRIT Rate": "critRate",
      "CRIT DMG": "critDmg",
      "Crit value": "critDmg",
      "Energy Regeneration Rate": "energy",
      "Elemental Mastery": "mastery",
      "Anomaly Proficiency": "mastery",
      SPD: "spd",
      "Outgoing Healing Boost": "heal",
      "Effect Hit Rate": "effect",
      "Break Effect": "break",
      Impact: "break",
      "PEN Ratio": "pen",
      "Ice DMG Boost": "dmg",
      "Physical DMG Bonus": "dmg",
    });
  });
});

