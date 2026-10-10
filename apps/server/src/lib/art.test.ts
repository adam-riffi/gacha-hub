import { describe, expect, it } from "vitest";
import { artJobs, assetPath, catalogSchema, communityArtUrl, genshin, getGame, splashKey, wuwa } from "@gacha/shared";

describe("communityArtUrl", () => {
  it("serves Genshin icons from Enka under the catalog key", () => {
    expect(communityArtUrl("genshin", "character", "UI_AvatarIcon_Arlecchino")).toBe("https://enka.network/ui/UI_AvatarIcon_Arlecchino.png");
    expect(communityArtUrl("genshin", "material", "UI_ItemIcon_104303")).toBe("https://enka.network/ui/UI_ItemIcon_104303.png");
  });

  it("serves HSR icons from Yatta by id, per kind", () => {
    const yatta = "https://sr.yatta.moe/hsr/assets/UI";
    expect(communityArtUrl("hsr", "character", "1503")).toBe(`${yatta}/avatar/medium/1503.png`);
    expect(communityArtUrl("hsr", "portrait", "1503")).toBe(`${yatta}/avatar/large/1503.png`);
    expect(communityArtUrl("hsr", "weapon", "23055")).toBe(`${yatta}/equipment/medium/23055.png`);
    expect(communityArtUrl("hsr", "gear", "71000")).toBe(`${yatta}/relic/71000.png`);
    expect(communityArtUrl("hsr", "material", "2")).toBe(`${yatta}/item/2.png`);
  });

  it("has nothing for missing keys, other kinds or games without a source", () => {
    expect(communityArtUrl("hsr", "character", undefined)).toBeNull();
    expect(communityArtUrl("hsr", "talent", "1503")).toBeNull();
    expect(communityArtUrl("zzz", "character", "1191")).toBeNull();
  });

  it("encodes keys so a catalog value cannot change the path", () => {
    expect(communityArtUrl("genshin", "weapon", "a/b?c")).toBe("https://enka.network/ui/a%2Fb%3Fc.png");
  });
});

describe("assetPath", () => {
  it("builds our own store's path for plain catalog keys", () => {
    expect(assetPath("/assets", "genshin", "character", "UI_AvatarIcon_Arlecchino")).toBe("/assets/genshin/character/UI_AvatarIcon_Arlecchino.webp");
  });

  it("passes full URLs and our own public paths through", () => {
    expect(assetPath("/assets", "x", "character", "https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(assetPath("/assets", "x", "character", "/games/genshin/icon.png")).toBe("/games/genshin/icon.png");
  });

  it("does not request source-internal paths that no server hosts", () => {
    expect(assetPath("/assets", "wuwa", "character", "/Game/Aki/UI/UIResources/Common/Image/IconRoleHead80/T_IconRoleHead80_7_UI.T_IconRoleHead80_7_UI")).toBeNull();
    expect(assetPath("/assets", "wuwa", "character", undefined)).toBeNull();
  });
});

describe("splash art (ADR 0006)", () => {
  it("is its own kind: Genshin's gacha art by the character's key, Star Rail's large art", () => {
    expect(splashKey("genshin", "UI_AvatarIcon_Ambor")).toBe("UI_Gacha_AvatarImg_Ambor");
    expect(splashKey("hsr", "1005")).toBe("1005");
    expect(communityArtUrl("genshin", "splash", splashKey("genshin", "UI_AvatarIcon_Ambor"))).toBe("https://enka.network/ui/UI_Gacha_AvatarImg_Ambor.png");
    expect(communityArtUrl("hsr", "splash", "1005")).toBe("https://sr.yatta.moe/hsr/assets/UI/avatar/large/1005.png");
  });

  it("takes the character's own splash key when the source names it apart from the icon (Wuthering Waves)", () => {
    expect(splashKey("wuwa", "T_IconRoleHead256_1_UI", "T_IconRole_Pile_yangyang_UI")).toBe("T_IconRole_Pile_yangyang_UI");
    expect(splashKey("genshin", "UI_AvatarIcon_Ambor", undefined)).toBe("UI_Gacha_AvatarImg_Ambor");
  });

  it("serves Wuthering Waves art from Wuthery by the game's own file names", () => {
    const ui = "https://files.wuthery.com/p/GameData/UIResources/Common/Image";
    expect(communityArtUrl("wuwa", "character", "T_IconRoleHead256_1_UI")).toBe(`${ui}/IconRoleHead256/T_IconRoleHead256_1_UI.png`);
    expect(communityArtUrl("wuwa", "splash", "T_IconRole_Pile_yangyang_UI")).toBe(`${ui}/IconRolePile/T_IconRole_Pile_yangyang_UI.png`);
    expect(communityArtUrl("wuwa", "weapon", "T_IconWeapon160_21010074_UI")).toBe(`${ui}/IconWeapon160/T_IconWeapon160_21010074_UI.png`);
  });
});

describe("artJobs (ADR 0006)", () => {
  it("lists each catalog image a game's mirror fetches: its kind, source and path in our store, once each", async () => {
    const jobs = artJobs(getGame("genshin")!, catalogSchema.parse(await genshin.loadCatalog!()));
    const amber = (kind: string) => jobs.find((j) => j.kind === kind && j.key.endsWith("Ambor"));
    expect(amber("character")).toEqual({ kind: "character", key: "UI_AvatarIcon_Ambor", source: "https://enka.network/ui/UI_AvatarIcon_Ambor.png", path: "genshin/character/UI_AvatarIcon_Ambor.webp" });
    expect(amber("splash")).toEqual({ kind: "splash", key: "UI_Gacha_AvatarImg_Ambor", source: "https://enka.network/ui/UI_Gacha_AvatarImg_Ambor.png", path: "genshin/splash/UI_Gacha_AvatarImg_Ambor.webp" });
    expect(jobs.some((j) => j.kind === "weapon" && j.key === "UI_EquipIcon_Bow_Crowfeather")).toBe(true);
    // Every piece of a set, not only the set's icon.
    expect(jobs.filter((j) => j.kind === "gear" && j.key.startsWith("UI_RelicIcon_15003_")).map((j) => j.key).sort()).toEqual(["UI_RelicIcon_15003_1", "UI_RelicIcon_15003_2", "UI_RelicIcon_15003_3", "UI_RelicIcon_15003_4", "UI_RelicIcon_15003_5"]);
    expect(new Set(jobs.map((j) => j.path)).size).toBe(jobs.length);
    expect(jobs.every((j) => j.source.startsWith("https://"))).toBe(true);
  });

  it("covers every Wuthering Waves character's icon and splash art, and every weapon", async () => {
    const catalog = catalogSchema.parse(await wuwa.loadCatalog!());
    const jobs = artJobs(getGame("wuwa")!, catalog);
    const yangyang = catalog.characters.find((c) => c.name === "Yangyang")!;
    expect(jobs.find((j) => j.kind === "splash" && j.key === yangyang.splash)?.path).toBe("wuwa/splash/T_IconRole_Pile_yangyang_UI.webp");
    for (const c of catalog.characters) {
      expect(jobs.some((j) => j.kind === "character" && j.key === c.icon)).toBe(true);
      expect(jobs.some((j) => j.kind === "splash" && j.key === c.splash)).toBe(true);
    }
    for (const w of catalog.weapons) expect(jobs.some((j) => j.kind === "weapon" && j.key === w.icon)).toBe(true);
  });

  it("has nothing for a game without art sources", () => {
    expect(artJobs(getGame("endfield")!, { gameKey: "endfield", source: "x", characters: [{ id: "1", key: "a", name: "A", rarity: 5, icon: "/Game/Aki/UI/x", talents: { keys: [], costs: [] }, ascension: [], maxLevel: 90 }] as never, weapons: [], gear: [], materials: [] })).toEqual([]);
  });
});
