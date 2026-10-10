import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endgameNow, gameDay, getGame, premiumCurrency, type CycleResultsDto, type GameDefinition, type GameRegion } from "@gacha/shared";
import { api } from "../lib/api";
import { formatRemaining } from "../lib/time";
import type { InstanceDetail } from "../lib/types";
import { GameTabs } from "../components/GameTabs";
import { EndgameHistory } from "../components/hub/EndgameHistory";
import { useReminderFlag } from "../lib/reminder";

const NUM = new Intl.NumberFormat("en-GB");
const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const WHEN = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
type Mode = GameDefinition["manifest"]["endgame"][number];
type Now = ReturnType<typeof endgameNow>["modes"][number];

/** How a mode repeats, as its card's chip says it. */
function cadenceLabel(m: Mode) {
  const a = m.anchor;
  return a.cadence === "monthly" ? `monthly · ${ordinal(a.day)}` : a.cadence === "version" ? "once per version" : a.cadence === "cycle" ? `every ${a.days} days` : a.cadence;
}


/**
 * A game's Endgame tab (WIREFRAMES.md G2): the premium claimed across the
 * open cycles and the next reset; a card per mode with its cycle window,
 * result, rewards and last six cycles, typed in place; each mode's history;
 * the upcoming resets.
 */
export function EndgamePage() {
  const { id } = useParams<{ id: string }>();
  const { data: instance } = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const { data: cycles } = useQuery({ queryKey: ["cycles", id], queryFn: () => api.get<CycleResultsDto>(`/api/instances/${id}/cycles`) });
  const remind = useReminderFlag(id!, "beforeEndgameReset");
  const game = instance && getGame(instance.gameKey);
  if (!instance || !game) return <div className="muted">Loading…</div>;

  const region = game.regions.find((r) => r.key === instance.regionKey) ?? game.regions[0]!;
  const now = new Date();
  const results = (cycles?.results ?? []).map((r) => ({ ...r, cycleStart: new Date(r.cycleStart) }));
  const eg = endgameNow(game, region, now, results);
  const premium = premiumCurrency(game);

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="endgame" gameKey={instance.gameKey} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <div className="endgame">
        <section className="graph eg-this" aria-label="This cycle">
          <div className="ph">
            <h3>This cycle</h3>
            <span className="tag">Manual</span>
          </div>
          <div className="eg-this-body">
            <div className="eg-claimed">
              <div className="kpi-value">
                {NUM.format(eg.claimed)}
                <small>
                  {" "}
                  / {NUM.format(eg.max)} {premium} claimed
                </small>
              </div>
              <div className="act-meter" role="img" aria-label={`${eg.claimed} of ${eg.max} ${premium} claimed`}>
                <span style={{ width: `${eg.max > 0 ? Math.min(100, (eg.claimed / eg.max) * 100) : 0}%` }} />
              </div>
            </div>
            {eg.next && (
              <div className="eg-next">
                <label className="act-remind">
                  <input type="checkbox" key={String(remind.on)} defaultChecked={remind.on} disabled={remind.pending} onChange={(e) => remind.set(e.target.checked)} />
                  Remind me 24 h before a reset with rewards left
                </label>
                <div className="kpi-label">Next reset</div>
                <div className="eg-next-mode">
                  {eg.next.mode.name} · {WHEN.format(eg.next.closes)}
                </div>
                <div className="mn mu">
                  in {formatRemaining(eg.next.closes.toISOString())}
                  {eg.next.mode.maxPremium !== undefined && ` · ${NUM.format(eg.next.unclaimed)} ${premium} unclaimed`}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="eg-modes">
          {eg.modes.map((m) => (
            <ModeCard key={m.mode.key} instanceId={id!} m={m} region={region} now={now} premium={premium} history={results.filter((r) => r.modeKey === m.mode.key)} />
          ))}
          {eg.modes.length === 0 && <p className="mu">No endgame mode on record for this game yet.</p>}
        </div>

        <EndgameHistory instanceId={id!} game={game} region={region} now={now} results={results} premium={premium} />

        <section className="card eg-upcoming" aria-label="Upcoming resets">
          <h3>Upcoming resets</h3>
          <div className="act-rows">
            {[...eg.modes]
              .sort((a, b) => (a.open ? a.closes : a.end).getTime() - (b.open ? b.closes : b.end).getTime())
              .map((m) => (
                <div key={m.mode.key} className="act-row">
                  <span className="act-title">{m.mode.name}</span>
                  <span className="mn mu">{m.open ? (m.mode.openDays ? "closes" : "new cycle") : "opens"}</span>
                  <span className="mn">{WHEN.format(m.open ? m.closes : m.end)}</span>
                </div>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}

function ModeCard({
  instanceId,
  m,
  region,
  now,
  premium,
  history,
}: {
  instanceId: string;
  m: Now;
  region: GameRegion;
  now: Date;
  premium: string;
  history: { cycleStart: Date; result: number | null }[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const save = useMutation({
    mutationFn: (body: object) => api.put(`/api/instances/${instanceId}/cycles`, body),
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["cycles", instanceId] });
    },
  });
  const { mode } = m;
  const span = m.closes.getTime() - m.start.getTime();
  const at = span > 0 ? Math.min(1, Math.max(0, (now.getTime() - m.start.getTime()) / span)) : 1;
  // The last six cycles, oldest first; the current one is the last bar.
  const last = [...history].sort((a, b) => a.cycleStart.getTime() - b.cycleStart.getTime()).slice(-6);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (String(f.get(k) ?? "") === "" ? null : Number(f.get(k)));
    save.mutate({ modeKey: mode.key, day: gameDay(region, now), result: num("result"), premium: num("premium"), detail: String(f.get("detail") ?? "") || null });
  };
  return (
    <section className="card eg-mode" aria-label={mode.name}>
      <div className="spread">
        <h3>{mode.name}</h3>
        <span className="badge">{cadenceLabel(mode)}</span>
      </div>
      <div className="eg-window" role="img" aria-label={`Cycle ${DATE.format(m.start)} to ${DATE.format(m.closes)}`}>
        <div className="eg-window-bar">
          <span style={{ width: `${at * 100}%` }} />
          <i style={{ left: `${at * 100}%` }} />
        </div>
        <div className="eg-window-dates mn mu">
          <span>{DATE.format(m.start)}</span>
          <span>{DATE.format(m.closes)}</span>
        </div>
      </div>
      <div className="kpi-value eg-result">
        {m.result ?? "—"}
        <small>
          {" "}
          / {mode.metric.max ?? "—"} {mode.metric.label}
        </small>
      </div>
      {mode.maxPremium !== undefined && (
        <div className="eg-rewards">
          <div className="act-xp">
            <span className="kpi-label">Rewards</span>
            <span className="mn">
              {NUM.format(m.premium)} / {NUM.format(mode.maxPremium)}
            </span>
          </div>
          <div className="act-meter act-meter-thin" role="img" aria-label={`${m.premium} of ${mode.maxPremium} ${premium}`}>
            <span style={{ width: `${Math.min(100, (m.premium / mode.maxPremium) * 100)}%` }} />
          </div>
        </div>
      )}
      <div className="kpi-label eg-last-label">Last {last.length || ""} cycles</div>
      <div className="eg-last" role="img" aria-label={`Last cycles: ${last.map((c) => c.result ?? "none").join(", ") || "none recorded"}`}>
        {last.map((c, k) => (
          <span key={c.cycleStart.toISOString()} className={k === last.length - 1 && c.cycleStart.getTime() === m.start.getTime() ? "on" : ""} style={{ height: `${mode.metric.max ? Math.max(4, ((c.result ?? 0) / mode.metric.max) * 100) : 50}%` }} />
        ))}
        {last.length === 0 && <span className="mu eg-none">No cycle recorded yet.</span>}
      </div>
      {editing ? (
        <form className="act-add" onSubmit={submit}>
          <label>
            <span>{cap(mode.metric.label)}</span>
            <input name="result" type="number" min={0} max={mode.metric.max} defaultValue={m.result ?? ""} autoFocus />
          </label>
          {mode.maxPremium !== undefined && (
            <label>
              <span>{premium}</span>
              <input name="premium" type="number" min={0} max={mode.maxPremium} defaultValue={m.premium || ""} />
            </label>
          )}
          <label>
            <span>Detail</span>
            <input name="detail" maxLength={80} placeholder="floor 12 · 6/9" />
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
        <button type="button" className="btn act-add-btn" aria-label={`Update ${mode.name}`} onClick={() => setEditing(true)}>
          Update
        </button>
      )}
    </section>
  );
}
