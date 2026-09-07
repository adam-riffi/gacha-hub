import { WUWA_ECHO_SLOTS, WUWA_ELEMENTS, type WuwaDoc } from "@gacha/shared";
import type { SheetProps } from "../../render/types";
import { PortraitPanel } from "../../render/PortraitPanel";
import { Labeled, Num, Select, StatList, Txt } from "../../components/inputs";

const FINAL_STATS = ["HP", "ATK", "DEF", "Energy Regen", "CRIT Rate", "CRIT DMG"];
type Echo = NonNullable<NonNullable<WuwaDoc["echoes"]>["slot1"]>;

function EchoCard({ title, echo, onChange }: { title: string; echo: Echo | undefined; onChange: (e: Echo) => void }) {
  const e = echo ?? {};
  const set = (p: Partial<Echo>) => onChange({ ...e, ...p });
  return (
    <div className="slot-card">
      <h4>{title}</h4>
      <Labeled label="Echo"><Txt value={e.name} onChange={(v) => set({ name: v })} /></Labeled>
      <Labeled label="Sonata set"><Txt value={e.setName} onChange={(v) => set({ setName: v })} /></Labeled>
      <div className="field-inline">
        <Labeled label="Cost">
          <select value={e.cost ?? ""} onChange={(ev) => set({ cost: ev.target.value ? (Number(ev.target.value) as 1 | 3 | 4) : undefined })}>
            <option value="">—</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="1">1</option>
          </select>
        </Labeled>
        <Labeled label="Level"><Num value={e.level} min={0} max={25} onChange={(v) => set({ level: v })} /></Labeled>
      </div>
      <Labeled label="Main Stat"><Txt value={e.mainStat} onChange={(v) => set({ mainStat: v })} /></Labeled>
      <Labeled label="Substats"><StatList value={e.substats} onChange={(rows) => set({ substats: rows })} /></Labeled>
    </div>
  );
}

export function WuwaSheet({ doc, setDoc, name, portraitUrl, onName, onPortrait }: SheetProps<WuwaDoc>) {
  const echoes = (doc.echoes ?? {}) as Record<string, Echo>;
  const setEcho = (slot: string, e: Echo) => setDoc((d) => ({ ...d, echoes: { ...(d.echoes ?? {}), [slot]: e } }));
  const setWeapon = (p: Partial<NonNullable<WuwaDoc["weapon"]>>) => setDoc((d) => ({ ...d, weapon: { ...(d.weapon ?? {}), ...p } }));
  const setSkill = (k: string, v: number | undefined) => setDoc((d) => ({ ...d, skills: { ...(d.skills ?? {}), [k]: v } }));
  const setStat = (k: string, v: number | undefined) => setDoc((d) => ({ ...d, stats: { ...(d.stats ?? {}), [k]: v as number } }));
  const skills = (doc.skills ?? {}) as Record<string, number | undefined>;
  const stats = (doc.stats ?? {}) as Record<string, number | undefined>;

  return (
    <div className="sheet">
      <PortraitPanel name={name} portraitUrl={portraitUrl} onName={onName} onPortrait={onPortrait}>
        <hr />
        <Labeled label="Level"><Num value={doc.level} min={1} max={90} onChange={(v) => setDoc((d) => ({ ...d, level: v }))} /></Labeled>
        <Labeled label="Attribute"><Select value={doc.element} options={WUWA_ELEMENTS} onChange={(v) => setDoc((d) => ({ ...d, element: v as WuwaDoc["element"] }))} /></Labeled>
        <Labeled label="Resonance Chain"><Num value={doc.sequence} min={0} max={6} onChange={(v) => setDoc((d) => ({ ...d, sequence: v }))} /></Labeled>
      </PortraitPanel>

      <div className="stack">
        <div className="card">
          <h3>Weapon</h3>
          <div className="slot-grid">
            <Labeled label="Name"><input value={doc.weapon?.name ?? ""} onChange={(e) => setWeapon({ name: e.target.value || undefined })} /></Labeled>
            <Labeled label="Level"><Num value={doc.weapon?.level} min={1} max={90} onChange={(v) => setWeapon({ level: v })} /></Labeled>
            <Labeled label="Syntonize"><Num value={doc.weapon?.syntonize} min={1} max={5} onChange={(v) => setWeapon({ syntonize: v })} /></Labeled>
          </div>
        </div>

        <div className="card">
          <h3>Echoes</h3>
          <div className="slot-grid">
            {WUWA_ECHO_SLOTS.map((slot) => (
              <EchoCard key={slot.key} title={slot.label} echo={echoes[slot.key]} onChange={(e) => setEcho(slot.key, e)} />
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Forte</h3>
          <div className="slot-grid">
            <Labeled label="Basic Attack"><Num value={skills.basic} min={1} max={10} onChange={(v) => setSkill("basic", v)} /></Labeled>
            <Labeled label="Resonance Skill"><Num value={skills.skill} min={1} max={10} onChange={(v) => setSkill("skill", v)} /></Labeled>
            <Labeled label="Forte Circuit"><Num value={skills.forte} min={1} max={10} onChange={(v) => setSkill("forte", v)} /></Labeled>
            <Labeled label="Resonance Liberation"><Num value={skills.liberation} min={1} max={10} onChange={(v) => setSkill("liberation", v)} /></Labeled>
            <Labeled label="Intro Skill"><Num value={skills.intro} min={1} max={10} onChange={(v) => setSkill("intro", v)} /></Labeled>
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
