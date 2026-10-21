import { describe, expect, it } from "vitest";
import { getGame } from "@gacha/shared";

// Round 17 (Georges: "a lot of tasks are missing too"): the chores each game actually resets, from its own checklists as
// Game8, GameWith and the games' guides list them (sources in docs/games/<key>.md), on top of the ones from his designs.
const EXPECTED: Record<string, [title: string, cadence: "daily" | "weekly" | "monthly", target?: number][]> = {
  genshin: [
    ["Expeditions", "daily", 5],
    ["Realm Currency", "daily"],
    ["Battle Pass dailies", "daily", 4],
    ["Reputation bounties", "weekly", 3],
    ["Reputation requests", "weekly", 3],
    ["Battle Pass weeklies", "weekly", 3],
  ],
  hsr: [
    ["Spend Trailblaze Power", "daily"],
    ["Nameless Honor dailies", "daily", 4],
    ["Nameless Honor weeklies", "weekly", 3],
  ],
  zzz: [
    ["Spend Battery", "daily"],
    ["Hollow Zero", "weekly"],
    ["Ridu Weekly", "weekly"],
    ["City Fund weeklies", "weekly", 3],
  ],
  wuwa: [
    ["Spend Waveplates", "daily"],
    ["Tacet Field", "daily"],
    ["Illusive Realm", "weekly"],
    ["Pioneer Podcast weeklies", "weekly", 3],
  ],
  endfield: [
    ["Daily sign-in", "daily"],
    ["Gift an operator", "daily"],
    ["Protocol Pass weeklies", "weekly", 3],
  ],
  nte: [
    ["Realm of Greed", "weekly"],
    ["Pink Paws Heist", "weekly"],
    ["Circle Bounty weeklies", "weekly"],
    ["City Stamina", "weekly"],
  ],
};

describe("each game's default tasks", () => {
  for (const [gameKey, expected] of Object.entries(EXPECTED)) {
    it(`${gameKey} lists the chores it resets, each with its cadence and steps`, () => {
      const tasks = getGame(gameKey)!.defaultTasks;
      for (const [title, cadence, target] of expected) {
        const task = tasks.find((candidate) => candidate.title === title);
        expect(task, `${gameKey}: ${title}`).toBeDefined();
        expect(task!.cadence, `${gameKey}: ${title}`).toBe(cadence);
        if (target !== undefined) expect(task!.target, `${gameKey}: ${title}`).toBe(target);
      }
      // Keys and titles stay unique: profiles take the defaults by title.
      expect(new Set(tasks.map((task) => task.key)).size).toBe(tasks.length);
      expect(new Set(tasks.map((task) => task.title.toLowerCase())).size).toBe(tasks.length);
    });
  }
});
