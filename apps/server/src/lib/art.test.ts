import { describe, expect, it } from "vitest";
import { assetPath, communityArtUrl } from "@gacha/shared";

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
