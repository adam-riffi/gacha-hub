import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cycleCsv, cycleHistory, elementColor, niceMax, type Clear, type CycleRow, type GameDefinition, type GameRegion } from "@gacha/shared";
import { api } from "../../lib/api";
import { assetUrl, communityAssetUrl } from "../../lib/assets";
import { GameIcon } from "../GameIcon";
import { Segmented } from "../ui";

const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });
const DAY = 86_400_000;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** "16 Aug – 15 Sep": a cycle's first and last day. */
export const cycleSpan = (start: Date, end: Date) => `${DAY_MONTH.format(start)} – ${DAY_MONTH.format(new Date(end.getTime() - DAY))}`;

type Rows = ReturnType<typeof cycleHistory>["rows"];
export type UnitOf = (id: string) => { name: string; icon?: string; tag?: string } | undefined;

/** A clear time in seconds as m:ss. */
export const minutesSeconds = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * Each stage's team as icons, with its clear time; given the mode's stages,
 * every stage shows, "—" where nothing is typed yet (Georges, round 6: "for
 * Stygian I wanna see my teams, time and difficulty").
 */
export function ClearList({ gameKey, teams, unitOf, stages }: { gameKey: string; teams: Clear[]; unitOf: UnitOf; stages?: readonly string[] }) {
  const rows = stages ? stages.map((stage) => teams.find((team) => team.stage === stage) ?? { stage, members: [], time: null }) : teams;
  if (!rows.length) return null;
  return (
    <ul className="eg-clears" aria-label="Clears">
      {rows.map((row) => (
        <li key={row.stage}>
          <span className="font-mono text-muted">{row.stage}</span>
          {row.members.length ? <TeamIcons gameKey={gameKey} members={row.members} unitOf={unitOf} /> : <span className="text-muted">—</span>}
          <span className="font-mono">{row.time !== null ? minutesSeconds(row.time) : ""}</span>
        </li>
      ))}
    </ul>
  );
}

export function TeamIcons({ gameKey, members, unitOf }: { gameKey: string; members: string[]; unitOf: UnitOf }) {
  return (
    <span className="eg-team">
      {members.map((member) => {
        const unit = unitOf(member);
        return <GameIcon key={member} src={assetUrl(gameKey, "character", unit?.icon)} fallback={communityAssetUrl(gameKey, "character", unit?.icon)} alt={unit?.name ?? member} tint={elementColor(gameKey, unit?.tag) ?? undefined} glyph="character" />;
      })}
    </span>
  );
}

/**
 * Endgame history per mode (WIREFRAMES.md G2): best, average, premium earned
 * and the current result; the result per cycle as a line (filled dots are
 * full clears; each point's title gives its dates and rewards); the cycles as
 * a table, older ones on demand; earlier cycles typed in; a CSV export. A
 * point or a row makes its cycle the mode card's (rounds 5 and 6).
 */
export function EndgameHistory({
  instanceId,
  game,
  region,
  now,
  results,
  premium,
  unitOf,
  onOpen,
}: {
  instanceId: string;
  game: GameDefinition;
  region: GameRegion;
  now: Date;
  results: CycleRow[];
  premium: string;
  unitOf: UnitOf;
  onOpen: (modeKey: string, at: number) => void;
}) {
  const modes = game.manifest.endgame;
  const [modeKey, setModeKey] = useState(modes[0]?.key ?? "");
  const [shown, setShown] = useState(12);
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (body: object) => api.put(`/api/instances/${instanceId}/cycles`, body),
    onSuccess: () => {
      setAdding(false);
      queryClient.invalidateQueries({ queryKey: ["cycles", instanceId] });
    },
  });
  const mode = modes.find((candidate) => candidate.key === modeKey) ?? modes[0];
  if (!mode) return null;
  const history = cycleHistory(mode, region, now, results);
  const rows = history.rows.slice(0, shown);
  const current = history.rows.find((row) => row.current);

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([cycleCsv(mode, region, history.rows, premium)], { type: "text/csv" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `${game.key}-${slug(mode.name)}-history.csv` });
    link.click();
    URL.revokeObjectURL(url);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const numberField = (fieldName: string) => (String(formData.get(fieldName) ?? "") === "" ? null : Number(formData.get(fieldName)));
    save.mutate({ modeKey: mode.key, day: String(formData.get("day")), result: numberField("result"), premium: numberField("premium"), detail: String(formData.get("detail") ?? "") || null });
  };

  return (
    <section className="card eg-history" aria-label="History">
      <div className="spread eg-history-head">
        <h3>History</h3>
        <Segmented
          label="Mode"
          options={modes.map((modeOption) => ({ value: modeOption.key, label: modeOption.name }))}
          value={mode.key}
          onChange={(pickedKey) => {
            setModeKey(pickedKey);
            setShown(12);
          }}
        />
        <span className="sp" />
        <button type="button" className="btn" onClick={() => setAdding(true)}>
          Add a past cycle
        </button>
        <button type="button" className="btn" onClick={exportCsv} disabled={history.rows.length === 0}>
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
            <span>{capitalize(mode.metric.label)}</span>
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
        <Tile label="Best" value={history.best ?? "—"} unit={mode.metric.label} note={history.best === null ? "nothing recorded yet" : `${history.bestTimes} ${history.bestTimes === 1 ? "time" : "times"} · last ${DAY_MONTH.format(history.bestLast!)}`} />
        <Tile label="Average" value={history.average === null ? "—" : history.average.toFixed(1)} unit={mode.metric.label} note={`last ${history.completed} completed ${history.completed === 1 ? "cycle" : "cycles"}`} />
        {mode.maxPremium !== undefined && <Tile label={`${premium} earned`} value={NUMBER_FORMAT.format(history.earned)} note={`of ${NUMBER_FORMAT.format(history.offered)} · ${history.rows.length} ${history.rows.length === 1 ? "cycle" : "cycles"}`} />}
        <Tile label="Now" value={current?.result ?? "—"} unit={`/ ${mode.metric.max ?? "—"} ${mode.metric.label}`} note={current?.detail ?? "this cycle"} />
      </div>

      <ResultsChart rows={[...rows].reverse()} max={mode.metric.max} label={mode.metric.label} premium={premium} offer={mode.maxPremium} onOpen={(at) => onOpen(mode.key, at)} />

      <table className="eg-table">
        <thead>
          <tr>
            <th>Cycle</th>
            <th className="num">{capitalize(mode.metric.label)}</th>
            <th>Detail</th>
            {mode.clears && <th>Teams</th>}
            {mode.maxPremium !== undefined && <th className="num">{premium}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cycleStart.toISOString()} className="eg-row" onClick={() => onOpen(mode.key, row.cycleStart.getTime())}>
              <td>
                <button type="button" className="eg-open">
                  {cycleSpan(row.cycleStart, row.end)}
                </button>
              </td>
              <td className="num">
                {row.full && <i className="eg-dot" aria-label="full clear" />}
                {row.result ?? "—"}
              </td>
              <td className="text-muted">{row.detail ?? ""}</td>
              {mode.clears && (
                <td>
                  <ClearList gameKey={game.key} teams={row.teams ?? []} unitOf={unitOf} />
                </td>
              )}
              {mode.maxPremium !== undefined && (
                <td className="num">
                  {row.premium === null ? "—" : NUMBER_FORMAT.format(row.premium)} / {NUMBER_FORMAT.format(mode.maxPremium)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {history.rows.length === 0 && <p className="text-muted act-empty">No cycle recorded for {mode.name} yet. Type the current one on its card, or add a past cycle.</p>}
      {history.rows.length > shown && (
        <button type="button" className="btn act-add-btn" onClick={() => setShown((shownCount) => shownCount + 6)}>
          Show {Math.min(6, history.rows.length - shown)} older cycles
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
      <div className="text-muted eg-tile-note">{note}</div>
    </div>
  );
}

const CHART_WIDTH = 1720; // about the card's width at 1920 px, so labels keep their size
const CHART_HEIGHT = 240;
const PADDING = { left: 40, right: 24, top: 24, bottom: 40 };

/** The result per cycle, oldest first: filled dots are full clears, the current cycle has a ring. */
function ResultsChart({ rows, max, label, premium, offer, onOpen }: { rows: Rows; max?: number; label: string; premium: string; offer?: number; onOpen: (at: number) => void }) {
  if (rows.length === 0) return null;
  const top = max ?? niceMax(Math.max(1, ...rows.map((row) => row.result ?? 0))).max;
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const xOf = (rowIndex: number) => PADDING.left + (rows.length > 1 ? (rowIndex * plotWidth) / (rows.length - 1) : plotWidth / 2);
  const yOf = (value: number) => PADDING.top + plotHeight * (1 - value / top);
  const points = rows.map((row, rowIndex) => ({ row, x: xOf(rowIndex), y: yOf(row.result ?? 0) }));
  const ticks = [0, top / 2, top].map((tick) => Math.round(tick));
  return (
    <figure className="eg-chart">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={`${capitalize(label)} per cycle: ${rows.map((row) => row.result ?? "none").join(", ")}`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <path d={`M${PADDING.left} ${yOf(tick)}H${CHART_WIDTH - PADDING.right}`} className="gl" />
            <text x={PADDING.left - 10} y={yOf(tick) + 4} textAnchor="end" className="eg-axis">
              {tick}
            </text>
          </g>
        ))}
        <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} className="eg-line" />
        {points.map((point) => (
          <g key={point.row.cycleStart.toISOString()} className="eg-pt" onClick={() => onOpen(point.row.cycleStart.getTime())}>
            <title>{`${cycleSpan(point.row.cycleStart, point.row.end)} · ${point.row.result ?? "—"} ${label}${offer !== undefined ? ` · ${point.row.premium ?? 0} / ${offer} ${premium}` : ""}`}</title>
            {point.row.current && <circle cx={point.x} cy={point.y} r={13} className="eg-ring" />}
            <circle cx={point.x} cy={point.y} r={6} className={point.row.full ? "eg-full" : "eg-part"} />
            <text x={point.x} y={CHART_HEIGHT - 12} textAnchor="middle" className="eg-axis">
              {MONTH.format(point.row.cycleStart)}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="font-mono text-muted eg-legend">
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
