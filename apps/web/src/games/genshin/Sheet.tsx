import {
  GENSHIN_ARTIFACT_SLOTS,
  GENSHIN_ELEMENTS,
  type GenshinDoc,
} from "@gacha/shared";
import type { SheetProps } from "../../render/types";
import { PortraitPanel } from "../../render/PortraitPanel";
import { GearPieceCard, type GearPiece } from "../../components/GearPieceCard";
import { Labeled, Num, Select } from "../../components/inputs";

const SUBSTATS = [
  "HP", "HP%", "ATK", "ATK%", "DEF", "DEF%",
  "Elemental Mastery", "Energy Recharge", "CRIT Rate", "CRIT DMG",
];
const FINAL_STATS = [
  "HP", "ATK", "DEF", "CRIT Rate", "CRIT DMG", "Elemental Mastery", "Energy Recharge",
];

// Valid main stats per artifact slot (flower/plume are fixed).
const ELEMENTAL_DMG = GENSHIN_ELEMENTS.map((e) => `${e} DMG`);
const MAIN_STATS: Record<string, string[]> = {
  flower: ["HP"],
  plume: ["ATK"],
  sands: ["HP%", "ATK%", "DEF%", "Elemental Mastery", "Energy Recharge"],
  goblet: ["HP%", "ATK%", "DEF%", "Elemental Mastery", "Physical DMG", ...ELEMENTAL_DMG],
  circlet: ["HP%", "ATK%", "DEF%", "Elemental Mastery", "CRIT Rate", "CRIT DMG", "Healing Bonus"],
};

export function GenshinSheet({ doc, setDoc, name, portraitUrl, onName, onPortrait, catalog }: SheetProps<GenshinDoc>) {
  // Element is fixed by the character unless the catalog gives none (Traveler).
  const fixedElement =
    catalog?.element && (GENSHIN_ELEMENTS as readonly string[]).includes(catalog.element) ? catalog.element : undefined;
  const artifacts = (doc.artifacts ?? {}) as Record<string, GearPiece>;
  const setArtifact = (slot: string, piece: GearPiece) =>
    setDoc((d) => ({ ...d, artifacts: { ...(d.artifacts ?? {}), [slot]: piece } }));
  const setWeapon = (p: Partial<NonNullable<GenshinDoc["weapon"]>>) =>
    setDoc((d) => ({ ...d, weapon: { ...(d.weapon ?? {}), ...p } }));
  const setTalent = (k: string, v: number | undefined) =>
    setDoc((d) => ({ ...d, talents: { ...(d.talents ?? {}), [k]: v } }));
  const setStat = (k: string, v: number | undefined) =>
    setDoc((d) => ({ ...d, stats: { ...(d.stats ?? {}), [k]: v as number } }));

  const talents = (doc.talents ?? {}) as Record<string, number | undefined>;
  const stats = (doc.stats ?? {}) as Record<string, number | undefined>;

  return (
    <div className="sheet">
      <PortraitPanel name={name} portraitUrl={portraitUrl} onName={onName} onPortrait={onPortrait}>
        <hr />
        <Labeled label="Level">
          <Num value={doc.level} min={1} max={90} onChange={(v) => setDoc((d) => ({ ...d, level: v }))} />
        </Labeled>
        <Labeled label="Element">
          {fixedElement ? (
            <span className="badge" style={{ marginTop: 4 }}>{fixedElement}</span>
          ) : (
            <Select value={doc.element} options={GENSHIN_ELEMENTS} onChange={(v) => setDoc((d) => ({ ...d, element: v as GenshinDoc["element"] }))} />
          )}
        </Labeled>
        <Labeled label="Constellation">
          <Num value={doc.constellation} min={0} max={6} onChange={(v) => setDoc((d) => ({ ...d, constellation: v }))} />
        </Labeled>
      </PortraitPanel>

      <div className="stack">
        <div className="card">
          <h3>Weapon{catalog?.weaponType ? <span className="small muted"> · {catalog.weaponType}</span> : null}</h3>
          <div className="slot-grid">
            <Labeled label="Name"><input value={doc.weapon?.name ?? ""} onChange={(e) => setWeapon({ name: e.target.value || undefined })} /></Labeled>
            <Labeled label="Level"><Num value={doc.weapon?.level} min={1} max={90} onChange={(v) => setWeapon({ level: v })} /></Labeled>
            <Labeled label="Refinement"><Num value={doc.weapon?.refinement} min={1} max={5} onChange={(v) => setWeapon({ refinement: v })} /></Labeled>
          </div>
        </div>

        <div className="card">
          <h3>Artifacts</h3>
          <div className="slot-grid">
            {GENSHIN_ARTIFACT_SLOTS.map((slot) => (
              <GearPieceCard
                key={slot.key}
                title={slot.label}
                piece={artifacts[slot.key]}
                maxLevel={20}
                substatOptions={SUBSTATS}
                mainStatOptions={MAIN_STATS[slot.key]}
                setOptions={catalog?.gearSets}
                onChange={(p) => setArtifact(slot.key, p)}
              />
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Talents</h3>
          <div className="slot-grid">
            <Labeled label="Normal Attack"><Num value={talents.normal} min={1} max={10} onChange={(v) => setTalent("normal", v)} /></Labeled>
            <Labeled label="Elemental Skill"><Num value={talents.skill} min={1} max={10} onChange={(v) => setTalent("skill", v)} /></Labeled>
            <Labeled label="Elemental Burst"><Num value={talents.burst} min={1} max={10} onChange={(v) => setTalent("burst", v)} /></Labeled>
          </div>
        </div>

        <div className="card">
          <h3>Stats</h3>
          <div className="slot-grid">
            {FINAL_STATS.map((s) => (
              <Labeled key={s} label={s}>
                <Num value={stats[s]} onChange={(v) => setStat(s, v)} />
              </Labeled>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
