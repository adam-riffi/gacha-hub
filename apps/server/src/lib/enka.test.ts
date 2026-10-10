import { describe, expect, it } from "vitest";
import { catalogSchema, hsr, mergeSynced, readEnkaGenshin, readEnkaHsr, readEnkaZzz, zzz } from "@gacha/shared";
import { hsrShowcase, showcase, zzzShowcase } from "../test/fixtures/enka.js";

const lookups = {
  weaponName: (id: string) => ({ "15301": "Raven Bow" })[id],
  setName: (id: string) => ({ "15003": "Wanderer's Troupe" })[id],
  skillOrder: (id: string) => ({ "10000021": ["10041", "10032", "10017"] })[id],
};

describe("Enka showcase (ADR 0005)", () => {
  it("reads each showcased character into our Genshin build shape, talent levels by the catalog's skill order", () => {
    expect(readEnkaGenshin(showcase, lookups)).toEqual({
      worldLevel: 8,
      level: 58,
      builds: [
        {
          catalogId: "10000021",
          doc: {
            level: 80,
            constellation: 2,
            talents: { normal: 6, skill: 9, burst: 8 },
            weapon: { catalogId: "15301", name: "Raven Bow", level: 90, refinement: 5 },
            artifacts: { flower: { setName: "Wanderer's Troupe", mainStat: "HP", level: 20, substats: [{ stat: "CRIT Rate", value: 3.9 }, { stat: "CRIT DMG", value: 7.8 }] } },
            stats: { HP: 15000, ATK: 1800, DEF: 700, "CRIT Rate": 55, "CRIT DMG": 120, "Energy Recharge": 130, "Elemental Mastery": 100 },
          },
        },
      ],
    });
  });

  it("says when the showcase is closed", () => {
    expect(readEnkaGenshin({ playerInfo: { nickname: "x", level: 1 }, ttl: 60 }, lookups)).toEqual({ error: "showcase_closed" });
  });

  it("updates what the last sync wrote and fills what is empty, but keeps what the user changed", () => {
    const synced = { level: 80, weapon: { level: 90, refinement: 1 }, stats: { HP: 15000 } };
    const current = { level: 85, weapon: { level: 90, refinement: 1 }, stats: { HP: 15000 }, element: "Pyro" };
    const incoming = { level: 90, weapon: { level: 90, refinement: 2, name: "Raven Bow" }, stats: { HP: 16000, ATK: 1900 } };
    expect(mergeSynced(current, synced, incoming)).toEqual({ level: 85, weapon: { level: 90, refinement: 2, name: "Raven Bow" }, stats: { HP: 16000, ATK: 1900 }, element: "Pyro" });
    expect(mergeSynced({ element: "Pyro" }, null, incoming)).toEqual({ ...incoming, element: "Pyro" });
  });

  it("reads a Star Rail showcase with the catalog's relic tables: a +15 5★ head is 705.6 HP, its rolls summed", async () => {
    const cat = catalogSchema.parse(await hsr.loadCatalog!());
    const read = readEnkaHsr(hsrShowcase, {
      weaponName: (id) => cat.weapons.find((w) => w.id === id)?.name,
      setName: (id) => cat.gear.find((g) => g.id === id)?.name,
      relicStats: cat.relicStats!,
    });
    expect(read).toEqual({
      level: 70,
      worldLevel: 6,
      builds: [
        {
          catalogId: "1005",
          doc: {
            level: 80,
            eidolon: 1,
            lightCone: { catalogId: "23006", name: "Patience Is All You Need", level: 80, superimposition: 2 },
            relics: {
              head: { setName: "Hunter of Glacial Forest", mainStat: "HP", level: 15, substats: [{ stat: "CRIT Rate", value: 5.5 }, { stat: "CRIT DMG", value: 5.2 }, { stat: "SPD", value: 2.6 }] },
              body: { setName: "Hunter of Glacial Forest", mainStat: "CRIT DMG", level: 15, substats: [] },
            },
          },
        },
      ],
    });
    expect(readEnkaHsr({ detailInfo: { nickname: "x", avatarDetailList: [] } }, { weaponName: () => undefined, setName: () => undefined, relicStats: cat.relicStats! })).toEqual({ error: "showcase_closed" });
  });

  it("reads a ZZZ showcase: the W-Engine and its phase, the five skills, each disc's set from its id, substats as base times rolls", async () => {
    const cat = catalogSchema.parse(await zzz.loadCatalog!());
    const read = readEnkaZzz(zzzShowcase, {
      weaponName: (id) => cat.weapons.find((w) => w.id === id)?.name,
      setName: (id) => cat.gear.find((g) => g.id === id)?.name,
    });
    expect(read).toEqual({
      level: 55,
      builds: [
        {
          catalogId: "1191",
          doc: {
            level: 60,
            mindscape: 1,
            wEngine: { name: "Deep Sea Visitor", level: 60, phase: 1 },
            skills: { basic: 11, special: 12, dodge: 9, chain: 12, assist: 8 },
            discs: {
              slot1: { setName: "Hormone Punk", mainStat: "HP", level: 15, substats: [{ stat: "CRIT Rate%", value: 7.2 }, { stat: "CRIT DMG%", value: 9.6 }, { stat: "ATK", value: 19 }] },
              slot4: { setName: "Hormone Punk", mainStat: "CRIT Rate%", level: 15, substats: [] },
            },
          },
        },
      ],
    });
    expect(readEnkaZzz({ PlayerInfo: { ShowcaseDetail: { AvatarList: [] } } }, { weaponName: () => undefined, setName: () => undefined })).toEqual({ error: "showcase_closed" });
  });
});
