import { ZZZ_ATTRIBUTES, ZZZ_DISC_SLOTS, type ZzzDoc } from "@gacha/shared";
import type { SheetProps } from "../../render/types";
import { PortraitPanel } from "../../render/PortraitPanel";
import { GearPieceCard, type GearPiece } from "../../components/GearPieceCard";
import { Labeled, Num, Select } from "../../components/inputs";

const FINAL_STATS = ["HP", "ATK", "DEF", "Impact", "CRIT Rate", "CRIT DMG", "Anomaly Proficiency"];

export function ZzzSheet({ doc, setDoc, name, portraitUrl, onName, onPortrait }: SheetProps<ZzzDoc>) {
  const discs = (doc.discs ?? {}) as Record<string, GearPiece>;
  const setDisc = (slot: string, piece: GearPiece) =>
    setDoc((d) => ({ ...d, discs: { ...(d.discs ?? {}), [slot]: piece } }));
  const setEngine = (p: Partial<NonNullable<ZzzDoc["wEngine"]>>) =>
    setDoc((d) => ({ ...d, wEngine: { ...(d.wEngine ?? {}), ...p } }));
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
        <Labeled label="Level"><Num value={doc.level} min={1} max={60} onChange={(v) => setDoc((d) => ({ ...d, level: v }))} /></Labeled>
        <Labeled label="Attribute"><Select value={doc.attribute} options={ZZZ_ATTRIBUTES} onChange={(v) => setDoc((d) => ({ ...d, attribute: v as ZzzDoc["attribute"] }))} /></Labeled>
        <Labeled label="Mindscape"><Num value={doc.mindscape} min={0} max={6} onChange={(v) => setDoc((d) => ({ ...d, mindscape: v }))} /></Labeled>
      </PortraitPanel>

      <div className="stack">
        <div className="card">
          <h3>W-Engine</h3>
          <div className="slot-grid">
            <Labeled label="Name"><input value={doc.wEngine?.name ?? ""} onChange={(e) => setEngine({ name: e.target.value || undefined })} /></Labeled>
            <Labeled label="Level"><Num value={doc.wEngine?.level} min={1} max={60} onChange={(v) => setEngine({ level: v })} /></Labeled>
            <Labeled label="Phase"><Num value={doc.wEngine?.phase} min={1} max={5} onChange={(v) => setEngine({ phase: v })} /></Labeled>
          </div>
        </div>

        <div className="card">
          <h3>Drive Discs</h3>
          <div className="slot-grid">
            {ZZZ_DISC_SLOTS.map((slot) => (
              <GearPieceCard key={slot.key} title={slot.label} piece={discs[slot.key]} maxLevel={15} onChange={(p) => setDisc(slot.key, p)} />
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Skills</h3>
          <div className="slot-grid">
            <Labeled label="Basic"><Num value={skills.basic} min={1} max={12} onChange={(v) => setSkill("basic", v)} /></Labeled>
            <Labeled label="Special"><Num value={skills.special} min={1} max={12} onChange={(v) => setSkill("special", v)} /></Labeled>
            <Labeled label="Chain"><Num value={skills.chain} min={1} max={12} onChange={(v) => setSkill("chain", v)} /></Labeled>
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
