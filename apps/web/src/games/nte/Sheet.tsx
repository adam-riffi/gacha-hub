import { NTE_SKILLS, type NteDoc } from "@gacha/shared";
import type { SheetProps } from "../../render/types";
import { PortraitPanel } from "../../render/PortraitPanel";
import { Labeled, Num, Txt } from "../../components/inputs";

/**
 * Neverness to Everness's character sheet, by hand (no catalog, no sync):
 * level, Awakening, the Arc and its Mixing, and the four skills. The Console
 * grid comes with F10's gear block.
 */
export function NteSheet({ doc, setDoc, name, portraitUrl, onName, onPortrait }: SheetProps<NteDoc>) {
  const setArc = (p: Partial<NonNullable<NteDoc["arc"]>>) => setDoc((d) => ({ ...d, arc: { ...(d.arc ?? {}), ...p } }));
  const skills = (doc.skills ?? {}) as Record<string, number | undefined>;
  const setSkill = (k: string, v: number | undefined) => setDoc((d) => ({ ...d, skills: { ...(d.skills ?? {}), [k]: v } }));
  return (
    <div className="sheet">
      <PortraitPanel name={name} portraitUrl={portraitUrl} onName={onName} onPortrait={onPortrait}>
        <hr />
        <Labeled label="Level">
          <Num value={doc.level} min={1} max={80} onChange={(v) => setDoc((d) => ({ ...d, level: v }))} />
        </Labeled>
        <Labeled label="Awakening">
          <Num value={doc.awakening} min={0} max={6} onChange={(v) => setDoc((d) => ({ ...d, awakening: v }))} />
        </Labeled>
        <Labeled label="Arc">
          <Txt value={doc.arc?.name} onChange={(v) => setArc({ name: v })} />
        </Labeled>
        <Labeled label="Arc level">
          <Num value={doc.arc?.level} min={1} max={80} onChange={(v) => setArc({ level: v })} />
        </Labeled>
        <Labeled label="Mixing">
          <Num value={doc.arc?.mixing} min={1} max={5} onChange={(v) => setArc({ mixing: v })} />
        </Labeled>
        {NTE_SKILLS.map((k) => (
          <Labeled key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
            <Num value={skills[k]} min={1} max={10} onChange={(v) => setSkill(k, v)} />
          </Labeled>
        ))}
      </PortraitPanel>
    </div>
  );
}
