import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { elementColor, enemiesFor, gameDay, versionAt, type GameDefinition, type GameRegion, type modeCycles } from "@gacha/shared";
import { api } from "../../lib/api";
import { communityAssetUrl } from "../../lib/assets";
import { GameIcon } from "../GameIcon";
import { ClearList, cycleSpan, type UnitOf } from "./EndgameHistory";

const NUM = new Intl.NumberFormat("en-GB");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Mode = GameDefinition["manifest"]["endgame"][number];
export type CycleRows = ReturnType<typeof modeCycles>;

/**
 * One cycle of a mode (Georges, round 5: "click on something and get the data
 * from that version on endgame, or open a small version history"): its dates
 * and version, result, rewards, detail, teams and the enemies of that cycle,
 * typed in place; the newer and older ones a step away, and every cycle of the
 * mode as a list to jump to.
 */
export function CycleDialog({
  instanceId,
  game,
  region,
  mode,
  rows,
  at,
  premium,
  unitOf,
  onPick,
  onClose,
}: {
  instanceId: string;
  game: GameDefinition;
  region: GameRegion;
  mode: Mode;
  rows: CycleRows;
  at: number;
  premium: string;
  unitOf: UnitOf;
  onPick: (at: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  useEffect(() => ref.current?.showModal(), []);
  const save = useMutation({
    mutationFn: (body: object) => api.put(`/api/instances/${instanceId}/cycles`, body),
    onSuccess: () => {
      setEditing(false);
      return qc.invalidateQueries({ queryKey: ["cycles", instanceId] });
    },
  });
  const i = Math.max(0, rows.findIndex((r) => r.cycleStart.getTime() === at));
  const r = rows[i]!;
  const version = versionAt(game, region, r.cycleStart);
  const pick = (k: number) => {
    setEditing(false);
    onPick(rows[k]!.cycleStart.getTime());
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (String(f.get(k) ?? "") === "" ? null : Number(f.get(k)));
    save.mutate({ modeKey: mode.key, day: gameDay(region, r.cycleStart), result: num("result"), premium: num("premium"), detail: String(f.get("detail") ?? "") || null });
  };

  return (
    <dialog ref={ref} className="card eg-dialog" aria-label={`${mode.name} · ${cycleSpan(r.cycleStart, r.end)}`} onClose={onClose}>
      <div className="spread eg-dialog-head">
        <span>
          <h3>{mode.name}</h3>
          <span className="mn mu">
            {cycleSpan(r.cycleStart, r.end)}
            {version && ` · version ${version}`}
          </span>
          {r.current && <span className="tag eg-now">Now</span>}
        </span>
        <span className="row">
          <button type="button" className="btn ghost sm" aria-label="Older cycle" disabled={i === rows.length - 1} onClick={() => pick(i + 1)}>
            ‹
          </button>
          <button type="button" className="btn ghost sm" aria-label="Newer cycle" disabled={i === 0} onClick={() => pick(i - 1)}>
            ›
          </button>
          <button type="button" className="btn ghost sm" aria-label="Close" onClick={() => ref.current?.close()}>
            ×
          </button>
        </span>
      </div>

      <div className="kpi-value eg-result">
        {r.full && <i className="eg-dot" aria-label="full clear" />}
        {r.result ?? "—"}
        <small>
          {" "}
          / {mode.metric.max ?? "—"} {mode.metric.label}
        </small>
      </div>
      {mode.maxPremium !== undefined && (
        <div className="eg-rewards">
          <div className="act-xp">
            <span className="kpi-label">{premium}</span>
            <span className="mn">
              {NUM.format(r.premium ?? 0)} / {NUM.format(mode.maxPremium)}
            </span>
          </div>
          <div className="act-meter act-meter-thin" role="img" aria-label={`${r.premium ?? 0} of ${mode.maxPremium} ${premium}`}>
            <span style={{ width: `${Math.min(100, ((r.premium ?? 0) / mode.maxPremium) * 100)}%` }} />
          </div>
        </div>
      )}
      {r.detail && !editing && <p className="eg-detail">{r.detail}</p>}
      {!editing && <ClearList gameKey={game.key} teams={r.teams ?? []} unitOf={unitOf} />}
      <Enemies game={game} modeKey={mode.key} today={gameDay(region, r.cycleStart)} />

      {editing ? (
        <form className="act-add" onSubmit={submit}>
          <label>
            <span>{cap(mode.metric.label)}</span>
            <input name="result" type="number" min={0} max={mode.metric.max} defaultValue={r.result ?? ""} autoFocus />
          </label>
          {mode.maxPremium !== undefined && (
            <label>
              <span>{premium}</span>
              <input name="premium" type="number" min={0} max={mode.maxPremium} defaultValue={r.premium ?? ""} />
            </label>
          )}
          <label>
            <span>Detail</span>
            <input name="detail" maxLength={80} defaultValue={r.detail ?? ""} />
          </label>
          <button type="submit" className="btn primary" disabled={save.isPending}>
            Save
          </button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>
            Cancel
          </button>
          {save.isError && <span className="hub-error">Not saved: over the mode's best or offer.</span>}
        </form>
      ) : (
        <button type="button" className="btn act-add-btn" onClick={() => setEditing(true)}>
          Edit
        </button>
      )}

      <div className="kpi-label eg-last-label">Cycles</div>
      <ol className="eg-cycles" aria-label="Cycles">
        {rows.map((row, k) => (
          <li key={row.cycleStart.toISOString()}>
            <button type="button" aria-current={k === i} onClick={() => pick(k)}>
              <span className="mn">{cycleSpan(row.cycleStart, row.end)}</span>
              <span className="eg-cycle-bar" aria-hidden="true">
                <i style={{ width: `${mode.metric.max && row.result !== null ? Math.min(100, (row.result / mode.metric.max) * 100) : 0}%` }} />
              </span>
              <span className="mn">{row.result ?? "—"}</span>
            </button>
          </li>
        ))}
      </ol>
    </dialog>
  );
}

/**
 * Who a cycle sends at you, where the mode rotates it (Georges, 2026-10-11:
 * "what enemies are on what level … like Stygian or Shiyu Defense"): each
 * stage with its level, each half's enemies, what they are weak to. A cycle
 * the data has not reached shows the last one before it, with its dates.
 */
export function Enemies({ game, modeKey, today }: { game: GameDefinition; modeKey: string; today: string }) {
  const { data } = useQuery({ queryKey: ["endgame-enemies", game.key], queryFn: () => game.loadEndgame!(), enabled: Boolean(game.loadEndgame), staleTime: Infinity });
  const cycle = data && enemiesFor(data, modeKey, today);
  if (!cycle) return null;
  return (
    <div className="eg-enemies">
      <div className="spread">
        <span className="kpi-label">Enemies</span>
        {!cycle.current && (
          <span className="mn mu">
            {cycle.begin} → {cycle.end}
          </span>
        )}
      </div>
      <ul aria-label="Enemies">
        {cycle.stages.map((s) => {
          // A boss stage (Deadly Assault, Stygian Onslaught) is named by its boss: its icon says it, the label keeps the level.
          const all = s.groups.flat();
          const boss = all.length === 1 && all[0]!.name === s.name;
          return (
            <li key={s.name}>
              <span className="mn mu eg-stage">{boss ? s.level && `Lv ${s.level}` : `${s.name}${s.level ? ` · Lv ${s.level}` : ""}`}</span>
              <span className="eg-groups">
                {s.groups.map((g, i) => (
                  <span key={i} className="eg-group">
                    {g.map((e) => (
                      <span key={e.name} className="eg-enemy" title={e.name}>
                        <GameIcon src={e.image ?? null} alt={e.name} />
                      </span>
                    ))}
                  </span>
                ))}
              </span>
              <span className="eg-weak">
                {s.weak.map((w) => {
                  // The element's icon where the game has a source for it, else its colour.
                  const icon = communityAssetUrl(game.key, "element", w);
                  return icon ? (
                    <span key={w} title={`Weak to ${w}`}>
                      <GameIcon src={icon} alt={`Weak to ${w}`} tint={elementColor(game.key, w) ?? undefined} />
                    </span>
                  ) : (
                    <i key={w} role="img" aria-label={`Weak to ${w}`} title={`Weak to ${w}`} style={{ background: elementColor(game.key, w) ?? "var(--text-muted)" }} />
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
