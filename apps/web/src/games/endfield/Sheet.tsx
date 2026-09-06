import { ENDFIELD_CLASSES, ENDFIELD_GEAR_SLOTS, type EndfieldDoc } from "@gacha/shared";
import type { SheetProps } from "../../render/types";
import { PortraitPanel } from "../../render/PortraitPanel";
import { GearPieceCard, type GearPiece } from "../../components/GearPieceCard";
import { Labeled, Num, Select, Txt } from "../../components/inputs";

const FINAL_STATS = ["HP", "ATK", "DEF", "CRIT Rate", "CRIT DMG"];

export function EndfieldSheet({ doc, setDoc, name, portraitUrl, onName, onPortrait }: SheetProps<EndfieldDoc>) {
  const gear = (doc.gear ?? {}) as Record<string, GearPiece>;
  const setGear = (slot: string, piece: GearPiece) =>
    setDoc((d) => ({ ...d, gear: { ...(d.gear ?? {}), [slot]: piece } }));
  const setWeapon = (p: Partial<NonNullable<EndfieldDoc["weapon"]>>) =>
    setDoc((d) => ({ ...d, weapon: { ...(d.weapon ?? {}), ...p } }));
  const setEssence = (p: Partial<{ name: string; effect: string }>) =>
    setDoc((d) => ({ ...d, weapon: { ...(d.weapon ?? {}), essence: { ...(d.weapon?.essence ?? {}), ...p } } }));
  const setSkill = (k: string, v: number | undefined) =>
    setDoc((d) => ({ ...d, skills: { ...(d.skills ?? {}), [k]: v } }));
  const setStat = (k: string, v: number | undefined) =>
    setDoc((d) => ({ ...d, stats: { ...(d.stats ?? {}), [k]: v as number } }));

  const skills = (doc.skills ?? {}) as Record<string, number | undefined>;
  const stats = (doc.stats ?? {}) as Record<string, number | undefined>;

  return (
    <div className="sheet">
      <PortraitPanel name={name} portraitUrl={portraitUrl} onName={onName} onPortrait={onPortrait}>
        <hr />
        <Labeled label="Level"><Num value={doc.level} min={1} max={80} onChange={(v) => setDoc((d) => ({ ...d, level: v }))} /></Labeled>
        <Labeled label="Class"><Select value={doc.class} options={ENDFIELD_CLASSES} onChange={(v) => setDoc((d) => ({ ...d, class: v as EndfieldDoc["class"] }))} /></Labeled>
        <Labeled label="Potential"><Num value={doc.potential} min={0} max={6} onChange={(v) => setDoc((d) => ({ ...d, potential: v }))} /></Labeled>
      </PortraitPanel>

      <div className="stack">
        <div className="card">
          <h3>Weapon &amp; Essence</h3>
          <div className="slot-grid">
            <Labeled label="Weapon Name"><input value={doc.weapon?.name ?? ""} onChange={(e) => setWeapon({ name: e.target.value || undefined })} /></Labeled>
            <Labeled label="Weapon Level"><Num value={doc.weapon?.level} min={1} max={80} onChange={(v) => setWeapon({ level: v })} /></Labeled>
          </div>
          <div className="slot-card" style={{ marginTop: 8 }}>
            <h4>Essence (attached to weapon)</h4>
            <Labeled label="Name"><Txt value={doc.weapon?.essence?.name} onChange={(v) => setEssence({ name: v })} /></Labeled>
            <Labeled label="Effect"><Txt value={doc.weapon?.essence?.effect} onChange={(v) => setEssence({ effect: v })} /></Labeled>
          </div>
        </div>

        <div className="card">
          <h3>Gear</h3>
          <div className="slot-grid">
            {ENDFIELD_GEAR_SLOTS.map((slot) => (
              <GearPieceCard key={slot.key} title={slot.label} piece={gear[slot.key]} maxLevel={20} onChange={(p) => setGear(slot.key, p)} />
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Skills</h3>
          <div className="slot-grid">
            <Labeled label="Combat Skill"><Num value={skills.combat} min={1} max={10} onChange={(v) => setSkill("combat", v)} /></Labeled>
            <Labeled label="Ultimate"><Num value={skills.ultimate} min={1} max={10} onChange={(v) => setSkill("ultimate", v)} /></Labeled>
          </div>
        </div>

        <div className="card">
          <h3>Stats</h3>
          <div className="slot-grid">
            {FINAL_STATS.map((s) => (
              <Labeled key={s} label={s}><Num value={stats[s]} onChange={(v) => setStat(s, v)} /></Labeled>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
