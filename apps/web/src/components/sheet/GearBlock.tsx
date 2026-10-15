import { Picker, type PickerOption } from "../Picker";
import { GameIcon } from "../GameIcon";
import { StatIcon } from "../StatIcon";
import { CharacterBuild, GearPiece, type GameDefinition } from "@gacha/shared";

type Doc = Record<string, unknown>;
type Row = { stat: string; value: number | string };
type Piece = { setName?: string; mainStat?: string; level?: number; substats?: Row[] };
const SUBSTATS = 4;
const formatValue = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/**
 * The gear block in the game's shape (WIREFRAMES.md G5): one piece per slot
 * of the manifest's gear (artifacts, relics, drive discs, echoes, gear,
 * console), each with its set, main stat, level and substats, its crit value,
 * and FARM where it sits outside the set the others complete.
 */
export function GearBlock({ game, doc, setDoc, sets: setOptions }: { game: GameDefinition; doc: Doc; setDoc: (updater: (currentDoc: Doc) => Doc) => void; sets: PickerOption[] }) {
  const gearManifest = game.manifest.gear;
  const gear = (doc[gearManifest.field] ?? {}) as Record<string, Piece | undefined>;
  const build = new CharacterBuild(game, doc);
  const farm = new Set(build.offSetSlots);
  const total = build.critValue ?? 0;
  const sets = build.gearSetLabel;
  const statOptions = [...new Set(gearManifest.slots.flatMap((slot) => slot.mainStats))];
  const setPiece = (slot: string, patch: Partial<Piece>) =>
    setDoc((currentDoc) => {
      const block = (currentDoc[gearManifest.field] ?? {}) as Record<string, Piece | undefined>;
      return { ...currentDoc, [gearManifest.field]: { ...block, [slot]: { ...(block[slot] ?? {}), ...patch } } };
    });

  return (
    <section className="card sh-gear" aria-label={gearManifest.name}>
      <div className="spread">
        <div className="row">
          <h3>{gearManifest.name}</h3>
          {sets && <span className="badge">{sets}</span>}
          {gearManifest.costCap && <span className="badge">cost cap {gearManifest.costCap}</span>}
        </div>
        <span className="font-mono text-muted">crit value {formatValue(total)}</span>
      </div>
      <div className="sh-pieces" style={{ gridTemplateColumns: `repeat(${Math.min(gearManifest.slots.length, 6)}, minmax(0, 1fr))` }}>
        {gearManifest.slots.map((slot) => {
          const piece = gear[slot.key] ?? {};
          const substats = [...(piece.substats ?? [])];
          while (substats.length < SUBSTATS) substats.push({ stat: "", value: "" });
          return (
            <div key={slot.key} className={`sh-piece ${farm.has(slot.key) ? "is-farm" : ""}`} role="group" aria-label={slot.label}>
              {/* The set as a large icon (Georges, round 7: the icons convey a lot by themselves). */}
              <div className="sh-piece-head">
                {(() => {
                  const set = setOptions.find((setOption) => setOption.name === piece.setName);
                  return <GameIcon src={set?.src ?? null} fallback={set?.fallback} alt={piece.setName ?? slot.label} glyph="gear" className="sh-piece-icon" />;
                })()}
                <span className="sh-piece-name">
                  <span className="kpi-label">{slot.label}</span>
                  <span className="font-mono">CV {formatValue(new GearPiece(piece).critValue)}</span>
                </span>
              </div>
              <Picker label={`${slot.label} set`} glyph="gear" placeholder="Set" value={piece.setName ?? ""} free options={setOptions} onPick={(_, text) => setPiece(slot.key, { setName: text || undefined })} />
              {slot.mainStats.length > 0 ? (
                <span className="sh-stat-row">
                  <StatIcon stat={piece.mainStat ?? ""} />
                  <select aria-label={`${slot.label} main stat`} value={piece.mainStat ?? ""} onChange={(event) => setPiece(slot.key, { mainStat: event.target.value || undefined })}>
                    <option value="">Main stat</option>
                    {slot.mainStats.map((mainStat) => (
                      <option key={mainStat} value={mainStat}>{mainStat}</option>
                    ))}
                  </select>
                </span>
              ) : (
                <span className="text-muted sh-fixed">no main stat to choose</span>
              )}
              <input aria-label={`${slot.label} level`} type="number" min={0} max={gearManifest.maxLevel} placeholder={`Level / ${gearManifest.maxLevel}`} value={piece.level ?? ""} onChange={(event) => setPiece(slot.key, { level: event.target.value === "" ? undefined : Number(event.target.value) })} />
              {substats.slice(0, SUBSTATS).map((substat, substatIndex) => (
                <div key={substatIndex} className="sh-sub">
                  <StatIcon stat={substat.stat} />
                  <Picker
                    label={`${slot.label} substat ${substatIndex + 1}`}
                    placeholder="Substat"
                    value={substat.stat}
                    icons={false}
                    free
                    options={statOptions.map((statName) => ({ id: statName, name: statName }))}
                    onPick={(_, text) => setPiece(slot.key, { substats: substats.map((otherSubstat, otherIndex) => (otherIndex === substatIndex ? { ...otherSubstat, stat: text } : otherSubstat)).filter((otherSubstat) => otherSubstat.stat || otherSubstat.value !== "") })}
                  />
                  <input
                    aria-label={`${slot.label} substat ${substatIndex + 1} value`}
                    type="number"
                    step="0.1"
                    value={substat.value}
                    onChange={(event) => setPiece(slot.key, { substats: substats.map((otherSubstat, otherIndex) => (otherIndex === substatIndex ? { ...otherSubstat, value: event.target.value === "" ? "" : Number(event.target.value) } : otherSubstat)).filter((otherSubstat) => otherSubstat.stat || otherSubstat.value !== "") })}
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
