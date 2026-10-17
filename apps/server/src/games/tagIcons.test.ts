import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { elementIconUrl, weaponTypeIconUrl } from "@gacha/shared";

type Entry = { tag?: string; weaponType?: string };
const characters = (gameKey: string) =>
  (JSON.parse(readFileSync(new URL(`../../../../packages/shared/src/games/${gameKey}/catalog.json`, import.meta.url), "utf8")) as { characters: Entry[] }).characters;
const distinct = (entries: Entry[], field: keyof Entry) => [...new Set(entries.map((entry) => entry[field]).filter((value): value is string => Boolean(value) && value !== "None"))];

// Georges: names shown as icons. Each source checked by hand on 2026-10-17 (ASSETS.md); a game without one keeps the words.
describe("element and weapon-type icons", () => {
  it("has an icon for every element of the five games a source covers, and none for Endfield's", () => {
    for (const gameKey of ["genshin", "hsr", "zzz", "wuwa", "nte"]) {
      for (const tag of distinct(characters(gameKey), "tag")) expect(elementIconUrl(gameKey, tag), `${gameKey} ${tag}`).toMatch(/^https:\/\//);
    }
    for (const tag of distinct(characters("endfield"), "tag")) expect(elementIconUrl("endfield", tag)).toBeNull();
  });

  it("names each source's own key where the game's word differs", () => {
    expect(elementIconUrl("genshin", "Cryo")).toBe("https://gi.yatta.moe/assets/UI/UI_Buff_Element_Ice.png");
    expect(elementIconUrl("hsr", "Lightning")).toMatch(/\/icon\/element\/Thunder\.png$/);
    expect(elementIconUrl("wuwa", "Havoc")).toMatch(/T_IconElementDark1\.png$/);
    expect(elementIconUrl("nte", "Psyche")).toMatch(/YH_UI_zudui_shaixuan_03\.webp$/);
    expect(elementIconUrl("zzz", "Ether")).toBe("https://static.nanoka.cc/assets/zzz/IconEther.webp");
    expect(elementIconUrl("genshin", "None")).toBeNull();
  });

  it("has an icon for every weapon type of Genshin, Star Rail and Zenless, and none where no source has them", () => {
    for (const gameKey of ["genshin", "hsr", "zzz"]) {
      for (const type of distinct(characters(gameKey), "weaponType")) expect(weaponTypeIconUrl(gameKey, type), `${gameKey} ${type}`).toMatch(/^https:\/\//);
    }
    expect(weaponTypeIconUrl("genshin", "Polearm")).toBe("https://enka.network/ui/UI_GachaTypeIcon_Pole.png");
    expect(weaponTypeIconUrl("hsr", "The Hunt")).toMatch(/\/icon\/path\/Hunt\.png$/);
    expect(weaponTypeIconUrl("wuwa", "Broadblade")).toBeNull();
    expect(weaponTypeIconUrl("endfield", "Arts Unit")).toBeNull();
  });
});
