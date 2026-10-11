import { Picker, type PickerOption } from "../Picker";
import { gearPieceCv, gearSetLabel, offSetSlots, type GameDefinition } from "@gacha/shared";

type Doc = Record<string, unknown>;
type Row = { stat: string; value: number | string };
type Piece = { setName?: string; mainStat?: string; level?: number; substats?: Row[] };
const SUBSTATS = 4;
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/**
 * The gear block in the game's shape (WIREFRAMES.md G5): one piece per slot
 * of the manifest's gear (artifacts, relics, drive discs, echoes, gear,
 * console), each with its set, main stat, level and substats, its crit value,
 * and FARM where it sits outside the set the others complete.
 */
export function GearBlock({ game, doc, setDoc, sets: setOptions }: { game: GameDefinition; doc: Doc; setDoc: (u: (d: Doc) => Doc) => void; sets: PickerOption[] }) {
  const g = game.manifest.gear;
  const gear = (doc[g.field] ?? {}) as Record<string, Piece | undefined>;
  const farm = new Set(offSetSlots(game, doc));
  const total = Object.values(gear).reduce((t, p) => t + (p ? gearPieceCv(p) : 0), 0);
  const sets = gearSetLabel(game, doc);
  const statOptions = [...new Set(g.slots.flatMap((s) => s.mainStats))];
  const setPiece = (slot: string, patch: Partial<Piece>) =>
    setDoc((d) => {
      const block = (d[g.field] ?? {}) as Record<string, Piece | undefined>;
      return { ...d, [g.field]: { ...block, [slot]: { ...(block[slot] ?? {}), ...patch } } };
    });

  return (
    <section className="card sh-gear" aria-label={g.name}>
      <div className="spread">
        <div className="row">
          <h3>{g.name}</h3>
          {sets && <span className="badge">{sets}</span>}
          {g.costCap && <span className="badge">cost cap {g.costCap}</span>}
        </div>
        <span className="mn mu">crit value {fmt(total)}</span>
      </div>
      <div className="sh-pieces" style={{ gridTemplateColumns: `repeat(${Math.min(g.slots.length, 6)}, minmax(0, 1fr))` }}>
        {g.slots.map((slot) => {
          const p = gear[slot.key] ?? {};
          const subs = [...(p.substats ?? [])];
          while (subs.length < SUBSTATS) subs.push({ stat: "", value: "" });
          return (
            <div key={slot.key} className={`sh-piece ${farm.has(slot.key) ? "is-farm" : ""}`}>
              <div className="spread">
                <span className="kpi-label">{slot.label}</span>
                <span className="mn">CV {fmt(gearPieceCv(p))}</span>
              </div>
              <Picker label={`${slot.label} set`} placeholder="Set" value={p.setName ?? ""} free options={setOptions} onPick={(_, text) => setPiece(slot.key, { setName: text || undefined })} />
              {slot.mainStats.length > 0 ? (
                <select aria-label={`${slot.label} main stat`} value={p.mainStat ?? ""} onChange={(e) => setPiece(slot.key, { mainStat: e.target.value || undefined })}>
                  <option value="">Main stat</option>
                  {slot.mainStats.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <span className="mu sh-fixed">no main stat to choose</span>
              )}
              <input aria-label={`${slot.label} level`} type="number" min={0} max={g.maxLevel} placeholder={`Level / ${g.maxLevel}`} value={p.level ?? ""} onChange={(e) => setPiece(slot.key, { level: e.target.value === "" ? undefined : Number(e.target.value) })} />
              {subs.slice(0, SUBSTATS).map((r, i) => (
                <div key={i} className="sh-sub">
                  <Picker
                    label={`${slot.label} substat ${i + 1}`}
                    placeholder="Substat"
                    value={r.stat}
                    icons={false}
                    free
                    options={statOptions.map((n) => ({ id: n, name: n }))}
                    onPick={(_, text) => setPiece(slot.key, { substats: subs.map((x, j) => (j === i ? { ...x, stat: text } : x)).filter((x) => x.stat || x.value !== "") })}
                  />
                  <input
                    aria-label={`${slot.label} substat ${i + 1} value`}
                    type="number"
                    step="0.1"
                    value={r.value}
                    onChange={(e) => setPiece(slot.key, { substats: subs.map((x, j) => (j === i ? { ...x, value: e.target.value === "" ? "" : Number(e.target.value) } : x)).filter((x) => x.stat || x.value !== "") })}
                  />
                </div>
              ))}
              {farm.has(slot.key) && <span className="badge todo">Farm</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
