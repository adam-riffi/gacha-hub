import { describe, expect, it } from "vitest";
import { mergeSynced, readEnkaGenshin } from "@gacha/shared";
import { showcase } from "../test/fixtures/enka.js";

const lookups = { weaponName: (id: string) => ({ "15301": "Raven Bow" })[id], setName: (id: string) => ({ "15003": "Wanderer's Troupe" })[id] };

describe("Enka showcase (ADR 0005)", () => {
  it("reads each showcased character into our Genshin build shape", () => {
    expect(readEnkaGenshin(showcase, lookups)).toEqual({
      worldLevel: 8,
      level: 58,
      builds: [
        {
          catalogId: "10000021",
          doc: {
            level: 80,
            constellation: 2,
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
});
