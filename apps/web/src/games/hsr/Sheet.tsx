import { HSR_ELEMENTS, HSR_PATHS, HSR_RELIC_SLOTS, type HsrDoc } from "@gacha/shared";
import type { SheetProps } from "../../render/types";
import { PortraitPanel } from "../../render/PortraitPanel";
import { GearPieceCard, type GearPiece } from "../../components/GearPieceCard";
import { Labeled, Num, Select } from "../../components/inputs";

const FINAL_STATS = ["HP", "ATK", "DEF", "SPD", "CRIT Rate", "CRIT DMG", "Break Effect"];

export function HsrSheet({ doc, setDoc, name, portraitUrl, onName, onPortrait }: SheetProps<HsrDoc>) {
  const relics = (doc.relics ?? {}) as Record<string, GearPiece>;
  const setRelic = (slot: string, piece: GearPiece) =>
    setDoc((d) => ({ ...d, relics: { ...(d.relics ?? {}), [slot]: piece } }));
  const setCone = (p: Partial<NonNullable<HsrDoc["lightCone"]>>) =>
    setDoc((d) => ({ ...d, lightCone: { ...(d.lightCone ?? {}), ...p } }));
  const setTrace = (k: string, v: number | undefined) =>
    setDoc((d) => ({ ...d, traces: { ...(d.traces ?? {}), [k]: v } }));
  const setStat = (k: string, v: number | undefined) =>
    setDoc((d) => ({ ...d, stats: { ...(d.stats ?? {}), [k]: v as number } }));

  const traces = (doc.traces ?? {}) as Record<string, number | undefined>;
  const stats = (doc.stats ?? {}) as Record<string, number | undefined>;

  return (
    <div className="sheet">
      <PortraitPanel name={name} portraitUrl={portraitUrl} onName={onName} onPortrait={onPortrait}>
        <hr />
        <Labeled label="Level"><Num value={doc.level} min={1} max={80} onChange={(v) => setDoc((d) => ({ ...d, level: v }))} /></Labeled>
        <Labeled label="Path"><Select value={doc.path} options={HSR_PATHS} onChange={(v) => setDoc((d) => ({ ...d, path: v as HsrDoc["path"] }))} /></Labeled>
        <Labeled label="Element"><Select value={doc.element} options={HSR_ELEMENTS} onChange={(v) => setDoc((d) => ({ ...d, element: v as HsrDoc["element"] }))} /></Labeled>
        <Labeled label="Eidolon"><Num value={doc.eidolon} min={0} max={6} onChange={(v) => setDoc((d) => ({ ...d, eidolon: v }))} /></Labeled>
      </PortraitPanel>

      <div className="stack">
        <div className="card">
          <h3>Light Cone</h3>
          <div className="slot-grid">
            <Labeled label="Name"><input value={doc.lightCone?.name ?? ""} onChange={(e) => setCone({ name: e.target.value || undefined })} /></Labeled>
            <Labeled label="Level"><Num value={doc.lightCone?.level} min={1} max={80} onChange={(v) => setCone({ level: v })} /></Labeled>
            <Labeled label="Superimposition"><Num value={doc.lightCone?.superimposition} min={1} max={5} onChange={(v) => setCone({ superimposition: v })} /></Labeled>
          </div>
        </div>

        <div className="card">
          <h3>Relics</h3>
          <div className="slot-grid">
            {HSR_RELIC_SLOTS.map((slot) => (
              <GearPieceCard key={slot.key} title={slot.label} piece={relics[slot.key]} maxLevel={15} onChange={(p) => setRelic(slot.key, p)} />
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Traces</h3>
          <div className="slot-grid">
            <Labeled label="Basic ATK"><Num value={traces.basic} min={1} max={10} onChange={(v) => setTrace("basic", v)} /></Labeled>
            <Labeled label="Skill"><Num value={traces.skill} min={1} max={12} onChange={(v) => setTrace("skill", v)} /></Labeled>
            <Labeled label="Ultimate"><Num value={traces.ultimate} min={1} max={12} onChange={(v) => setTrace("ultimate", v)} /></Labeled>
            <Labeled label="Talent"><Num value={traces.talent} min={1} max={12} onChange={(v) => setTrace("talent", v)} /></Labeled>
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
