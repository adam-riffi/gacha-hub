import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cycleCsv, cycleHistory, elementColor, niceMax, type Clear, type CycleRow, type GameDefinition, type GameRegion } from "@gacha/shared";
import { api } from "../../lib/api";
import { assetUrl, communityAssetUrl } from "../../lib/assets";
import { GameIcon } from "../GameIcon";
import { Segmented } from "../ui";

const NUM = new Intl.NumberFormat("en-GB");
const DM = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });
const DAY = 86_400_000;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** "16 Aug – 15 Sep": a cycle's first and last day. */
const span = (start: Date, end: Date) => `${DM.format(start)} – ${DM.format(new Date(end.getTime() - DAY))}`;

type Rows = ReturnType<typeof cycleHistory>["rows"];
export type UnitOf = (id: string) => { name: string; icon?: string; tag?: string } | undefined;

/** A clear time in seconds as m:ss. */
export const mss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;

/** Each stage's team as icons, with its clear time. */
export function ClearList({ gameKey, teams, unitOf }: { gameKey: string; teams: Clear[]; unitOf: UnitOf }) {
  if (!teams.length) return null;
  return (
    <ul className="eg-clears" aria-label="Clears">
      {teams.map((t) => (
        <li key={t.stage}>
          <span className="mn mu">{t.stage}</span>
          <TeamIcons gameKey={gameKey} members={t.members} unitOf={unitOf} />
          {t.time !== null && <span className="mn">{mss(t.time)}</span>}
        </li>
      ))}
    </ul>
  );
}

export function TeamIcons({ gameKey, members, unitOf }: { gameKey: string; members: string[]; unitOf: UnitOf }) {
  return (
    <span className="eg-team">
      {members.map((m) => {
        const u = unitOf(m);
        return <GameIcon key={m} src={assetUrl(gameKey, "character", u?.icon)} fallback={communityAssetUrl(gameKey, "character", u?.icon)} alt={u?.name ?? m} tint={elementColor(gameKey, u?.tag) ?? undefined} />;
      })}
    </span>
  );
}

/**
 * Endgame history per mode (WIREFRAMES.md G2): best, average, premium earned
 * and the current result; the result per cycle as a line (filled dots are
 * full clears; each point's title gives its dates and rewards); the cycles as
 * a table, older ones on demand; earlier cycles typed in; a CSV export.
 */
export function EndgameHistory({
  instanceId,
  game,
  region,
  now,
  results,
  premium,
  unitOf,
}: {
  instanceId: string;
  game: GameDefinition;
  region: GameRegion;
  now: Date;
  results: CycleRow[];
  premium: string;
  unitOf: UnitOf;
}) {
  const modes = game.manifest.endgame;
  const [modeKey, setModeKey] = useState(modes[0]?.key ?? "");
  const [shown, setShown] = useState(12);
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (body: object) => api.put(`/api/instances/${instanceId}/cycles`, body),
    onSuccess: () => {
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["cycles", instanceId] });
    },
  });
  const mode = modes.find((m) => m.key === modeKey) ?? modes[0];
  if (!mode) return null;
  const h = cycleHistory(mode, region, now, results);
  const rows = h.rows.slice(0, shown);
  const current = h.rows.find((r) => r.current);

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([cycleCsv(mode, region, h.rows, premium)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${game.key}-${slug(mode.name)}-history.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (String(f.get(k) ?? "") === "" ? null : Number(f.get(k)));
    save.mutate({ modeKey: mode.key, day: String(f.get("day")), result: num("result"), premium: num("premium"), detail: String(f.get("detail") ?? "") || null });
  };

  return (
    <section className="card eg-history" aria-label="History">
      <div className="spread eg-history-head">
        <h3>History</h3>
        <Segmented
          label="Mode"
          options={modes.map((m) => ({ value: m.key, label: m.name }))}
          value={mode.key}
          onChange={(k) => {
            setModeKey(k);
            setShown(12);
          }}
        />
        <span className="sp" />
        <button type="button" className="btn" onClick={() => setAdding(true)}>
          Add a past cycle
        </button>
        <button type="button" className="btn" onClick={exportCsv} disabled={h.rows.length === 0}>
          Export CSV
        </button>
      </div>

      {adding && (
        <form className="act-add" onSubmit={submit}>
          <label>
            <span>A day in the cycle</span>
            <input name="day" type="date" required max={new Date().toISOString().slice(0, 10)} />
          </label>
          <label>
            <span>{cap(mode.metric.label)}</span>
            <input name="result" type="number" min={0} max={mode.metric.max} />
          </label>
          {mode.maxPremium !== undefined && (
            <label>
              <span>{premium}</span>
              <input name="premium" type="number" min={0} max={mode.maxPremium} />
            </label>
          )}
          <label>
            <span>Detail</span>
            <input name="detail" maxLength={80} />
          </label>
          <button type="submit" className="btn primary" disabled={save.isPending}>
            Save
          </button>
          <button type="button" className="btn" onClick={() => setAdding(false)}>
            Cancel
          </button>
          {save.isError && <span className="hub-error">Not saved: check the day, result and rewards.</span>}
        </form>
      )}

      <div className="eg-tiles">
        <Tile label="Best" value={h.best ?? "—"} unit={mode.metric.label} note={h.best === null ? "nothing recorded yet" : `${h.bestTimes} ${h.bestTimes === 1 ? "time" : "times"} · last ${DM.format(h.bestLast!)}`} />
        <Tile label="Average" value={h.average === null ? "—" : h.average.toFixed(1)} unit={mode.metric.label} note={`last ${h.completed} completed ${h.completed === 1 ? "cycle" : "cycles"}`} />
        {mode.maxPremium !== undefined && <Tile label={`${premium} earned`} value={NUM.format(h.earned)} note={`of ${NUM.format(h.offered)} · ${h.rows.length} ${h.rows.length === 1 ? "cycle" : "cycles"}`} />}
        <Tile label="Now" value={current?.result ?? "—"} unit={`/ ${mode.metric.max ?? "—"} ${mode.metric.label}`} note={current?.detail ?? "this cycle"} />
      </div>

      <ResultsChart rows={[...rows].reverse()} max={mode.metric.max} label={mode.metric.label} premium={premium} offer={mode.maxPremium} />

      <table className="eg-table">
        <thead>
          <tr>
            <th>Cycle</th>
            <th className="num">{cap(mode.metric.label)}</th>
            <th>Detail</th>
            {mode.clears && <th>Teams</th>}
            {mode.maxPremium !== undefined && <th className="num">{premium}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.cycleStart.toISOString()}>
              <td>
                {span(r.cycleStart, r.end)}
                {r.current && <span className="tag eg-now">Now</span>}
              </td>
              <td className="num">
                {r.full && <i className="eg-dot" aria-label="full clear" />}
                {r.result ?? "—"}
              </td>
              <td className="mu">{r.detail ?? ""}</td>
              {mode.clears && (
                <td>
                  <ClearList gameKey={game.key} teams={r.teams ?? []} unitOf={unitOf} />
                </td>
              )}
              {mode.maxPremium !== undefined && (
                <td className="num">
                  {r.premium === null ? "—" : NUM.format(r.premium)} / {NUM.format(mode.maxPremium)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {h.rows.length === 0 && <p className="mu act-empty">No cycle recorded for {mode.name} yet. Type the current one on its card, or add a past cycle.</p>}
      {h.rows.length > shown && (
        <button type="button" className="btn act-add-btn" onClick={() => setShown((n) => n + 6)}>
          Show {Math.min(6, h.rows.length - shown)} older cycles
        </button>
      )}
    </section>
  );
}

function Tile({ label, value, unit, note }: { label: string; value: string | number; unit?: string; note: string }) {
  return (
    <div className="kpi eg-tile">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {unit && <small> {unit}</small>}
      </div>
      <div className="mu eg-tile-note">{note}</div>
    </div>
  );
}

const CW = 1720; // about the card's width at 1920 px, so labels keep their size
const CH = 240;
const PAD = { l: 40, r: 24, t: 24, b: 40 };

/** The result per cycle, oldest first: filled dots are full clears, the current cycle has a ring. */
function ResultsChart({ rows, max, label, premium, offer }: { rows: Rows; max?: number; label: string; premium: string; offer?: number }) {
  if (rows.length === 0) return null;
  const top = max ?? niceMax(Math.max(1, ...rows.map((r) => r.result ?? 0))).max;
  const w = CW - PAD.l - PAD.r;
  const h = CH - PAD.t - PAD.b;
  const x = (k: number) => PAD.l + (rows.length > 1 ? (k * w) / (rows.length - 1) : w / 2);
  const y = (v: number) => PAD.t + h * (1 - v / top);
  const pts = rows.map((r, k) => ({ r, x: x(k), y: y(r.result ?? 0) }));
  const ticks = [0, top / 2, top].map((v) => Math.round(v));
  return (
    <figure className="eg-chart">
      <svg viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={`${cap(label)} per cycle: ${rows.map((r) => r.result ?? "none").join(", ")}`}>
        {ticks.map((v) => (
          <g key={v}>
            <path d={`M${PAD.l} ${y(v)}H${CW - PAD.r}`} className="gl" />
            <text x={PAD.l - 10} y={y(v) + 4} textAnchor="end" className="eg-axis">
              {v}
            </text>
          </g>
        ))}
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} className="eg-line" />
        {pts.map((p) => (
          <g key={p.r.cycleStart.toISOString()}>
            <title>{`${span(p.r.cycleStart, p.r.end)} · ${p.r.result ?? "—"} ${label}${offer !== undefined ? ` · ${p.r.premium ?? 0} / ${offer} ${premium}` : ""}`}</title>
            {p.r.current && <circle cx={p.x} cy={p.y} r={13} className="eg-ring" />}
            <circle cx={p.x} cy={p.y} r={6} className={p.r.full ? "eg-full" : "eg-part"} />
            <text x={p.x} y={CH - 12} textAnchor="middle" className="eg-axis">
              {MONTH.format(p.r.cycleStart)}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mn mu eg-legend">
        <span>
          <i className="eg-key full" /> {max !== undefined ? `${max} ${label}, full clear` : "full clear"}
        </span>
        <span>
          <i className="eg-key" /> partial
        </span>
      </figcaption>
    </figure>
  );
}
