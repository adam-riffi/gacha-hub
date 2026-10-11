import { describe, expect, it } from "vitest";
import { catalogSchema, communityArtUrl, nte, nteDocSchema } from "@gacha/shared";

// Georges, round 4: "try to populate Endfield and NTE for data on them".
describe("nte catalog", () => {
  it("is schema-valid with real coverage, from the Hakushin data's live version", async () => {
    const catalog = catalogSchema.parse(await nte.loadCatalog!());
    expect(catalog.gameKey).toBe("nte");
    expect(catalog.source).toMatch(/^hakushin@static\.nanoka\.cc\/nte\//);
    expect(catalog.characters.length).toBeGreaterThanOrEqual(20);
    expect(catalog.weapons.length).toBeGreaterThanOrEqual(40);
    expect(catalog.materials.length).toBeGreaterThanOrEqual(20);
  });

  it("every cost references a catalog material, Beetle Coins included", async () => {
    const catalog = catalogSchema.parse(await nte.loadCatalog!());
    const ids = new Set(catalog.materials.map((m) => m.id));
    const steps = [...catalog.characters.flatMap((c) => [...c.ascension, ...Object.values(c.talents.costsByKey ?? {}).flat()]), ...catalog.weapons.flatMap((w) => w.ascension)];
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.flatMap((s) => s.materials).filter((m) => !ids.has(m.materialId))).toEqual([]);
    expect(catalog.materials.find((m) => m.id === "gold")?.name).toBe("Beetle Coin");
  });

  it("maps Sakiri: an S-rank Incantation character to level 80, her four skills to 10 under the doc's names, with their own names", async () => {
    const catalog = catalogSchema.parse(await nte.loadCatalog!());
    const sakiri = catalog.characters.find((c) => c.id === "1003")!;
    expect(sakiri).toMatchObject({ name: "Sakiri", rarity: 5, tag: "Incantation", maxLevel: 80 });
    expect(sakiri.ascension.map((s) => s.atLevel)).toEqual([40, 50, 60, 70, 80]);
    expect(sakiri.talents.keys).toEqual(["basic", "skill", "ultimate", "support"]);
    expect(Object.keys(nteDocSchema.shape.skills.unwrap().shape)).toEqual(sakiri.talents.keys);
    expect(sakiri.talents.costsByKey?.basic?.at(-1)?.atLevel).toBe(10);
    expect(sakiri.talents.info?.find((t) => t.key === "basic")?.name).toBe("Kiroumaru Headbutt");
  });

  it("maps the Arcs with their type, and serves the art from Hakushin by its game path", async () => {
    const catalog = catalogSchema.parse(await nte.loadCatalog!());
    const waltz = catalog.weapons.find((w) => w.id === "fork_Arachne")!;
    expect(waltz).toMatchObject({ name: "Eternal Waltz", rarity: 5, type: "Condensate", maxLevel: 80 });
    expect(communityArtUrl("nte", "character", "Game/UI/UI_Icon/AvatarImage/256/player_003_256")).toBe("https://static.nanoka.cc/assets/nte/Game%2FUI%2FUI_Icon%2FAvatarImage%2F256%2Fplayer_003_256.webp");
  });

  it("keeps a build's Arc by its catalog id", () => {
    expect(nteDocSchema.parse({ arc: { catalogId: "fork_Arachne", level: 50 } }).arc?.catalogId).toBe("fork_Arachne");
  });
});
