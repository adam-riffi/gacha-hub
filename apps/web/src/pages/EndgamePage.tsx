import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endgameNow, gameDay, getGame, modeCycles, premiumCurrency, versionAt, type CycleResultsDto, type GameDefinition, type GameRegion, type TeamDto } from "@gacha/shared";
import { api } from "../lib/api";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { useCatalog } from "../lib/catalog";
import { Picker, type PickerOption } from "../components/Picker";
import { formatRemaining } from "../lib/time";
import type { InstanceDetail } from "../lib/types";
import { GameTabs } from "../components/GameTabs";
import { ClearList, EndgameHistory, TeamIcons, cycleSpan, mss, type UnitOf } from "../components/hub/EndgameHistory";
import { Enemies } from "../components/hub/Enemies";
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
 * the upcoming resets. Any cycle becomes its card's, from a bar, the arrows,
 * a point or a row of the history (Georges, rounds 5 and 6).
 */
export function EndgamePage() {
  const { id } = useParams<{ id: string }>();
  const { data: instance } = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const { data: cycles } = useQuery({ queryKey: ["cycles", id], queryFn: () => api.get<CycleResultsDto>(`/api/instances/${id}/cycles`) });
  const remind = useReminderFlag(id!, "beforeEndgameReset");
  const game = instance && getGame(instance.gameKey);
  const { catalog, index } = useCatalog(instance?.gameKey);
  const teams = useQuery({ queryKey: ["teams", id], queryFn: () => api.get<TeamDto[]>(`/api/instances/${id}/teams`), enabled: Boolean(game?.loadCatalog) });
  // Each mode's picked cycle (its start), the current one when none.
  const [picked, setPicked] = useState<Record<string, number | null>>({});
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
        <GameTabs instanceId={id!} active="endgame" gameKey={instance.gameKey} />
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
            <ModeCard key={m.mode.key} instanceId={id!} game={game} m={m} region={region} now={now} premium={premium} roster={roster} rows={modeCycles(m.mode, region, now, results)} at={picked[m.mode.key] ?? null} onSelect={(at) => setPicked((p) => ({ ...p, [m.mode.key]: at }))} />
          ))}
          {eg.modes.length === 0 && <p className="mu">No endgame mode on record for this game yet.</p>}
        </div>

        <EndgameHistory
          instanceId={id!}
          game={game}
          region={region}
          now={now}
          results={results}
          premium={premium}
          unitOf={unitOf}
          onOpen={(modeKey, at) => {
            setPicked((p) => ({ ...p, [modeKey]: at }));
            document.getElementById(`eg-${modeKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />

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

/**
 * A mode's card: the cycle picked (the current one by default; a bar, the
 * arrows, a point or a row of the history pick another, round 6) with its
 * dates and version, result, rewards, detail, each stage's team and time,
 * the enemies, typed in place; the last six cycles as bars.
 */
function ModeCard({
  instanceId,
  game,
  m,
  region,
  now,
  premium,
  roster,
  rows,
  at,
  onSelect,
}: {
  instanceId: string;
  game: GameDefinition;
  m: Now;
  region: GameRegion;
  now: Date;
  premium: string;
  roster: Roster;
  rows: ReturnType<typeof modeCycles>;
  at: number | null;
  onSelect: (at: number | null) => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { mode } = m;
  const stages = mode.clears?.stages ?? [];
  const i = Math.max(0, at === null ? rows.findIndex((r) => r.current) : rows.findIndex((r) => r.cycleStart.getTime() === at));
  const r = rows[i]!;
  const day = gameDay(region, r.current ? now : r.cycleStart);
  const version = versionAt(game, region, r.cycleStart);
  const pick = (k: number) => {
    setEditing(false);
    onSelect(rows[k]!.current ? null : rows[k]!.cycleStart.getTime());
  };
  // Each stage's team and typed time while the form is open.
  const [draft, setDraft] = useState<Record<string, { members: string[]; time: string }>>({});
  const open = () => {
    setDraft(Object.fromEntries(stages.map((s) => {
      const t = r.teams?.find((x) => x.stage === s);
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
  const span = m.closes.getTime() - m.start.getTime();
  const done = !r.current ? 1 : span > 0 ? Math.min(1, Math.max(0, (now.getTime() - m.start.getTime()) / span)) : 1;
  const from = r.current ? m.start : r.cycleStart;
  const to = r.current ? m.closes : r.end;
  // The last six cycles, oldest first.
  const last = [...rows].reverse().slice(-6);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (String(f.get(k) ?? "") === "" ? null : Number(f.get(k)));
    const teams = stages.map((s) => ({ stage: s, members: draft[s]?.members ?? [], time: secs(draft[s]?.time ?? "") })).filter((t) => t.members.length > 0 || t.time !== null);
    save.mutate({ modeKey: mode.key, day, result: num("result"), premium: num("premium"), detail: String(f.get("detail") ?? "") || null, ...(stages.length ? { teams } : {}) });
  };
  return (
    <section className={`card eg-mode ${r.current ? "" : "is-past"}`} aria-label={mode.name} id={`eg-${mode.key}`}>
      <div className="spread">
        <h3>{mode.name}</h3>
        <span className="badge">{cadenceLabel(mode)}</span>
      </div>
      <div className="eg-cycle-nav">
        <button type="button" className="btn ghost sm" aria-label="Older cycle" disabled={i === rows.length - 1} onClick={() => pick(i + 1)}>
          ‹
        </button>
        <span className="mn">
          {cycleSpan(r.cycleStart, r.end)}
          {version && <span className="mu"> · version {version}</span>}
        </span>
        {r.current ? <span className="tag eg-now">Now</span> : null}
        <button type="button" className="btn ghost sm" aria-label="Newer cycle" disabled={i === 0} onClick={() => pick(i - 1)}>
          ›
        </button>
        {!r.current && (
          <button type="button" className="btn sm" onClick={() => onSelect(null)}>
            Back to now
          </button>
        )}
      </div>
      <div className="eg-window" role="img" aria-label={`Cycle ${DATE.format(from)} to ${DATE.format(to)}`}>
        <div className="eg-window-bar">
          <span style={{ width: `${done * 100}%` }} />
          {r.current && <i style={{ left: `${done * 100}%` }} />}
        </div>
        <div className="eg-window-dates mn mu">
          <span>{AT.format(from)}</span>
          <span>{AT.format(to)}</span>
        </div>
      </div>
      <div className="kpi-value eg-result">
        {r.result ?? "—"}
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
              {NUM.format(r.premium ?? 0)} / {NUM.format(mode.maxPremium)}
            </span>
          </div>
          <div className="act-meter act-meter-thin" role="img" aria-label={`${r.premium ?? 0} of ${mode.maxPremium} ${premium}`}>
            <span style={{ width: `${Math.min(100, ((r.premium ?? 0) / mode.maxPremium) * 100)}%` }} />
          </div>
        </div>
      )}
      {r.detail && !editing && <p className="eg-detail">{r.detail}</p>}
      <div className="kpi-label eg-last-label">Last {last.length || ""} cycles</div>
      <div className="eg-last">
        {last.map((c) => (
          <button
            type="button"
            key={c.cycleStart.toISOString()}
            className={c === r ? "on" : ""}
            aria-pressed={c === r}
            style={{ height: `${mode.metric.max ? Math.max(4, ((c.result ?? 0) / mode.metric.max) * 100) : 50}%` }}
            aria-label={`Cycle of ${DATE.format(c.cycleStart)}: ${c.result ?? "—"} ${mode.metric.label}`}
            title={`${DATE.format(c.cycleStart)} · ${c.result ?? "—"} ${mode.metric.label}`}
            onClick={() => pick(rows.indexOf(c))}
          />
        ))}
      </div>
      {!editing && <ClearList gameKey={roster.gameKey} teams={r.teams ?? []} unitOf={roster.unitOf} stages={stages.length ? stages : undefined} />}
      <Enemies game={game} modeKey={mode.key} today={day} />
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
            <input name="detail" maxLength={80} placeholder="floor 12 · 6/9" defaultValue={r.detail ?? ""} />
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
                    glyph="character"
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
