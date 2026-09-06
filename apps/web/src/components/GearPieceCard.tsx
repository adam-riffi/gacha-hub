import type { StatRow } from "@gacha/shared";
import { Labeled, Num, StatList, Txt } from "./inputs";

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
}: {
  title: string;
  piece: GearPiece | undefined;
  onChange: (piece: GearPiece) => void;
  maxLevel?: number;
  substatOptions?: readonly string[];
}) {
  const p = piece ?? {};
  const set = (partial: Partial<GearPiece>) => onChange({ ...p, ...partial });
  return (
    <div className="slot-card">
      <h4>{title}</h4>
      <Labeled label="Set">
        <Txt value={p.setName} onChange={(v) => set({ setName: v })} />
      </Labeled>
      <Labeled label="Main Stat">
        <Txt value={p.mainStat} onChange={(v) => set({ mainStat: v })} />
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
