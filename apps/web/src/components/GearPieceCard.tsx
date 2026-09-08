import type { StatRow } from "@gacha/shared";
import { Labeled, Num, Select, StatList, Txt } from "./inputs";

export interface GearPiece {
  setName?: string;
  mainStat?: string;
  level?: number;
  substats?: StatRow[];
}

/** A single gear piece (artifact / relic / drive disc / gear) editor card. */
export function GearPieceCard({
  title,
  piece,
  onChange,
  maxLevel,
  substatOptions,
  mainStatOptions,
  setOptions,
}: {
  title: string;
  piece: GearPiece | undefined;
  onChange: (piece: GearPiece) => void;
  maxLevel?: number;
  substatOptions?: readonly string[];
  /** When given, the main stat is a constrained dropdown instead of free text. */
  mainStatOptions?: readonly string[];
  /** When given, the set is chosen from the catalog's set names. */
  setOptions?: readonly string[];
}) {
  const p = piece ?? {};
  const set = (partial: Partial<GearPiece>) => onChange({ ...p, ...partial });
  return (
    <div className="slot-card">
      <h4>{title}</h4>
      <Labeled label="Set">
        {setOptions ? (
          <Select value={p.setName ?? ""} options={["", ...setOptions]} onChange={(v) => set({ setName: v || undefined })} />
        ) : (
          <Txt value={p.setName} onChange={(v) => set({ setName: v })} />
        )}
      </Labeled>
      <Labeled label="Main Stat">
        {mainStatOptions ? (
          <Select value={p.mainStat ?? ""} options={["", ...mainStatOptions]} onChange={(v) => set({ mainStat: v || undefined })} />
        ) : (
          <Txt value={p.mainStat} onChange={(v) => set({ mainStat: v })} />
        )}
      </Labeled>
      <Labeled label="Level">
        <Num value={p.level} min={0} max={maxLevel} onChange={(v) => set({ level: v })} />
      </Labeled>
      <Labeled label="Substats">
        <StatList value={p.substats} options={substatOptions} onChange={(rows) => set({ substats: rows })} />
      </Labeled>
    </div>
  );
}
