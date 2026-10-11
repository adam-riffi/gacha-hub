import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endgameNow, gameDay, getGame, premiumCurrency, type Clear, type CycleResultsDto, type GameDefinition, type GameRegion, type TeamDto } from "@gacha/shared";
import { api } from "../lib/api";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { useCatalog } from "../lib/catalog";
import { Picker, type PickerOption } from "../components/Picker";
import { formatRemaining } from "../lib/time";
import type { InstanceDetail } from "../lib/types";
import { GameTabs } from "../components/GameTabs";
import { ClearList, EndgameHistory, TeamIcons, mss, type UnitOf } from "../components/hub/EndgameHistory";
import { useReminderFlag } from "../lib/reminder";

const NUM = new Intl.NumberFormat("en-GB");
const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const AT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const WHEN = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "1:35" or "95" as seconds; anything else (or out of range) as none. */
const secs = (s: string) => {
  const m = /^(?:(\d{1,2}):)?(\d{1,4})$/.exec(s.trim());
  const v = m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : 0;
  return v >= 1 && v <= 3600 ? v : null;
};
/** What the stage pickers need: the units, the saved teams, the party size. */
type Roster = { gameKey: string; units: PickerOption[]; teams: TeamDto[]; size: number; unitOf: UnitOf };
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
  const { catalog, index } = useCatalog(instance?.gameKey);
  const teams = useQuery({ queryKey: ["teams", id], queryFn: () => api.get<TeamDto[]>(`/api/instances/${id}/teams`), enabled: Boolean(game?.loadCatalog) });
  if (!instance || !game) return <div className="muted">Loading…</div>;

  const region = game.regions.find((r) => r.key === instance.regionKey) ?? game.regions[0]!;
  const now = new Date();
  const results = (cycles?.results ?? []).map((r) => ({ ...r, cycleStart: new Date(r.cycleStart) }));
  const eg = endgameNow(game, region, now, results);
  const premium = premiumCurrency(game);
  const unitOf: UnitOf = (cid) => index?.characters.get(cid);
  const roster: Roster = {
    gameKey: game.key,
    units: [...(catalog?.characters ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((u) => ({ id: u.id, name: u.name, src: assetUrl(game.key, "character", u.icon), fallback: communityAssetUrl(game.key, "character", u.icon) })),
    teams: teams.data ?? [],
    size: game.teamSize ?? 4,
    unitOf,
  };

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="endgame" gameKey={instance.gameKey} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <div className="endgame">
        <section className="graph eg-this" aria-label="This cycle">
          <div className="ph">
            <h3>This cycle</h3>
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
                  Remind 24 h before reset
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
            <ModeCard key={m.mode.key} instanceId={id!} m={m} region={region} now={now} premium={premium} roster={roster} history={results.filter((r) => r.modeKey === m.mode.key)} />
          ))}
          {eg.modes.length === 0 && <p className="mu">No endgame mode on record for this game yet.</p>}
        </div>

        <EndgameHistory instanceId={id!} game={game} region={region} now={now} results={results} premium={premium} unitOf={unitOf} />

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
  roster,
  history,
}: {
  instanceId: string;
  m: Now;
  region: GameRegion;
  now: Date;
  premium: string;
  roster: Roster;
  history: { cycleStart: Date; result: number | null; teams?: Clear[] }[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const stages = m.mode.clears?.stages ?? [];
  const current = history.find((c) => c.cycleStart.getTime() === m.start.getTime());
  // Each stage's team and typed time while the form is open.
  const [draft, setDraft] = useState<Record<string, { members: string[]; time: string }>>({});
  const open = () => {
    setDraft(Object.fromEntries(stages.map((s) => {
      const t = current?.teams?.find((x) => x.stage === s);
      return [s, { members: t?.members ?? [], time: t?.time ? mss(t.time) : "" }];
    })));
    setEditing(true);
  };
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
    const teams = stages.map((s) => ({ stage: s, members: draft[s]?.members ?? [], time: secs(draft[s]?.time ?? "") })).filter((t) => t.members.length > 0 || t.time !== null);
    save.mutate({ modeKey: mode.key, day: gameDay(region, now), result: num("result"), premium: num("premium"), detail: String(f.get("detail") ?? "") || null, ...(stages.length ? { teams } : {}) });
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
          <span>{AT.format(m.start)}</span>
          <span>{AT.format(m.closes)}</span>
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
      {!editing && <ClearList gameKey={roster.gameKey} teams={current?.teams ?? []} unitOf={roster.unitOf} />}
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
          {stages.map((s) => {
            const d = draft[s] ?? { members: [], time: "" };
            const set = (p: Partial<typeof d>) => setDraft((all) => ({ ...all, [s]: { ...d, ...p } }));
            return (
              <fieldset key={s} className="eg-clear-edit">
                <legend className="kpi-label">{s}</legend>
                {d.members.length > 0 && (
                  <button type="button" className="btn ghost sm" aria-label={`Clear ${s}`} onClick={() => set({ members: [] })}>
                    <TeamIcons gameKey={roster.gameKey} members={d.members} unitOf={roster.unitOf} /> ×
                  </button>
                )}
                {d.members.length < roster.size && roster.units.length > 0 && (
                  <Picker
                    label={`Add to ${s}`}
                    placeholder="+ Unit or team"
                    value=""
                    options={[
                      ...roster.teams.filter((t) => t.members.length > 0).map((t) => ({ id: `team:${t.id}`, name: t.name, sub: "team" })),
                      ...roster.units.filter((u) => !d.members.includes(u.id)),
                    ]}
                    onPick={(o) => {
                      if (!o) return;
                      const team = roster.teams.find((t) => `team:${t.id}` === o.id);
                      set({ members: team ? team.members.slice(0, roster.size) : [...d.members, o.id] });
                    }}
                  />
                )}
                {mode.clears?.timed && (
                  <label>
                    <span>Clear time</span>
                    <input inputMode="numeric" placeholder="m:ss" maxLength={5} value={d.time} onChange={(e) => set({ time: e.target.value })} />
                  </label>
                )}
              </fieldset>
            );
          })}
          <button type="submit" className="btn primary" disabled={save.isPending}>
            Save
          </button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>
            Cancel
          </button>
          {save.isError && <span className="hub-error">Not saved: over the mode's best or offer.</span>}
        </form>
      ) : (
        <button type="button" className="btn act-add-btn" aria-label={`Update ${mode.name}`} onClick={open}>
          Update
        </button>
      )}
    </section>
  );
}
