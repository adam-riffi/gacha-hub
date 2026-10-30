import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { artSlotKey, endgameNow, enemiesFor, gameDay, getGame, modeCycles, modeStages, premiumCurrency, versionAt, type CycleResultsDto, type GameDefinition, type GameRegion, type TeamDto } from "@gacha/shared";
import { api } from "../lib/api";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { useCatalog } from "../lib/catalog";
import type { PickerOption } from "../components/Picker";
import { TeamWindow } from "../components/hub/TeamWindow";
import { MetricIcon } from "../components/hub/MetricIcon";
import { formatRemaining } from "../lib/time";
import type { InstanceDetail } from "../lib/types";
import { GameTabs } from "../components/GameTabs";
import { EndgameHistory, TeamIcons, cycleSpan, minutesSeconds, type UnitOf } from "../components/hub/EndgameHistory";
import { StageLines } from "../components/hub/StageLines";
import { useReminderFlag } from "../lib/reminder";
import { SlotArt } from "../components/SlotArt";

const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");
const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const SHORT_TIME = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const WHEN = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ordinal = (value: number) => `${value}${value % 10 === 1 && value !== 11 ? "st" : value % 10 === 2 && value !== 12 ? "nd" : value % 10 === 3 && value !== 13 ? "rd" : "th"}`;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** "1:35" or "95" as seconds; anything else (or out of range) as none. */
const toSeconds = (text: string) => {
  const match = /^(?:(\d{1,2}):)?(\d{1,4})$/.exec(text.trim());
  const seconds = match ? Number(match[1] ?? 0) * 60 + Number(match[2]) : 0;
  return seconds >= 1 && seconds <= 3600 ? seconds : null;
};
/** What the stage pickers need: the units, the saved teams, the party size. */
type Roster = { gameKey: string; units: PickerOption[]; teams: TeamDto[]; size: number; unitOf: UnitOf };
type Mode = GameDefinition["manifest"]["endgame"][number];
type Now = ReturnType<typeof endgameNow>["modes"][number];

/** How a mode repeats, as its card's chip says it. */
function cadenceLabel(mode: Mode) {
  const anchor = mode.anchor;
  return anchor.cadence === "monthly" ? `monthly · ${ordinal(anchor.day)}` : anchor.cadence === "version" ? "once per version" : anchor.cadence === "cycle" ? `every ${anchor.days} days` : anchor.cadence;
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

  const region = game.regions.find((candidate) => candidate.key === instance.regionKey) ?? game.regions[0]!;
  const now = new Date();
  const results = (cycles?.results ?? []).map((result) => ({ ...result, cycleStart: new Date(result.cycleStart) }));
  const endgame = endgameNow(game, region, now, results);
  const premium = premiumCurrency(game);
  const unitOf: UnitOf = (catalogId) => index?.characters.get(catalogId);
  const roster: Roster = {
    gameKey: game.key,
    units: [...(catalog?.characters ?? [])].sort((first, second) => first.name.localeCompare(second.name)).map((character) => ({ id: character.id, name: character.name, src: assetUrl(game.key, "character", character.icon), fallback: communityAssetUrl(game.key, "character", character.icon) })),
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
                {NUMBER_FORMAT.format(endgame.claimed)}
                <small>
                  {" "}
                  / {NUMBER_FORMAT.format(endgame.max)} {premium} claimed
                </small>
              </div>
              <div className="act-meter" role="img" aria-label={`${endgame.claimed} of ${endgame.max} ${premium} claimed`}>
                <span style={{ width: `${endgame.max > 0 ? Math.min(100, (endgame.claimed / endgame.max) * 100) : 0}%` }} />
              </div>
            </div>
            {endgame.next && (
              <div className="eg-next">
                <label className="act-remind">
                  <input type="checkbox" key={String(remind.on)} defaultChecked={remind.on} disabled={remind.pending} onChange={(event) => remind.set(event.target.checked)} />
                  Remind 24 h before reset
                </label>
                <div className="kpi-label">Next reset</div>
                <div className="eg-next-mode">
                  {endgame.next.mode.name} · {WHEN.format(endgame.next.closes)}
                </div>
                <div className="font-mono text-muted">
                  in {formatRemaining(endgame.next.closes.toISOString())}
                  {endgame.next.mode.maxPremium !== undefined && ` · ${NUMBER_FORMAT.format(endgame.next.unclaimed)} ${premium} unclaimed`}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="eg-modes">
          {endgame.modes.map((modeNow) => (
            <ModeCard key={modeNow.mode.key} instanceId={id!} game={game} modeNow={modeNow} region={region} now={now} premium={premium} roster={roster} rows={modeCycles(modeNow.mode, region, now, results)} at={picked[modeNow.mode.key] ?? null} onSelect={(at) => setPicked((previous) => ({ ...previous, [modeNow.mode.key]: at }))} />
          ))}
          {endgame.modes.length === 0 && <p className="text-muted">No endgame mode on record for this game yet.</p>}
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
            setPicked((previous) => ({ ...previous, [modeKey]: at }));
            document.getElementById(`eg-${modeKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />

        <section className="card eg-upcoming" aria-label="Upcoming resets">
          <h3>Upcoming resets</h3>
          <div className="act-rows">
            {[...endgame.modes]
              .sort((first, second) => (first.open ? first.closes : first.end).getTime() - (second.open ? second.closes : second.end).getTime())
              .map((modeNow) => (
                <div key={modeNow.mode.key} className="act-row">
                  <span className="act-title">{modeNow.mode.name}</span>
                  <span className="font-mono text-muted">{modeNow.open ? (modeNow.mode.openDays ? "closes" : "new cycle") : "opens"}</span>
                  <span className="font-mono">{WHEN.format(modeNow.open ? modeNow.closes : modeNow.end)}</span>
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
 * dates and version, result, rewards, detail, its stages one line each (team,
 * score, time, main enemy; round 7), typed in place; the last six cycles as bars.
 */
function ModeCard({
  instanceId,
  game,
  modeNow: modeNow,
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
  modeNow: Now;
  region: GameRegion;
  now: Date;
  premium: string;
  roster: Roster;
  rows: ReturnType<typeof modeCycles>;
  at: number | null;
  onSelect: (at: number | null) => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { mode } = modeNow;
  const shownIndex = Math.max(0, at === null ? rows.findIndex((row) => row.current) : rows.findIndex((row) => row.cycleStart.getTime() === at));
  const shown = rows[shownIndex]!;
  const day = gameDay(region, shown.current ? now : shown.cycleStart);
  const enemies = useQuery({ queryKey: ["endgame-enemies", game.key], queryFn: () => game.loadEndgame!(), enabled: Boolean(game.loadEndgame), staleTime: Infinity });
  // Only modes fought stage by stage (they have clears) list stages; the long runs have none.
  const stages = mode.clears ? modeStages(mode.clears.stages, enemies.data && enemiesFor(enemies.data, mode.key, day)) : [];
  const version = versionAt(game, region, shown.cycleStart);
  const pick = (rowIndex: number) => {
    setEditing(false);
    onSelect(rows[rowIndex]!.current ? null : rows[rowIndex]!.cycleStart.getTime());
  };
  // Each stage's team, typed time and score while the form is open.
  const [draft, setDraft] = useState<Record<string, { members: string[]; time: string; score: string }>>({});
  const [choosing, setChoosing] = useState<string | null>(null);
  const open = () => {
    setDraft(Object.fromEntries(stages.map((stage) => {
      const savedTeam = shown.teams?.find((team) => team.stage === stage.key);
      return [stage.key, { members: savedTeam?.members ?? [], time: savedTeam?.time ? minutesSeconds(savedTeam.time) : "", score: savedTeam?.score != null ? String(savedTeam.score) : "" }];
    })));
    setEditing(true);
  };
  const save = useMutation({
    mutationFn: (body: object) => api.put(`/api/instances/${instanceId}/cycles`, body),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["cycles", instanceId] });
    },
  });
  const span = modeNow.closes.getTime() - modeNow.start.getTime();
  const done = !shown.current ? 1 : span > 0 ? Math.min(1, Math.max(0, (now.getTime() - modeNow.start.getTime()) / span)) : 1;
  const from = shown.current ? modeNow.start : shown.cycleStart;
  const to = shown.current ? modeNow.closes : shown.end;
  // The last six cycles, oldest first.
  const last = [...rows].reverse().slice(-6);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const numberField = (fieldName: string) => (String(formData.get(fieldName) ?? "") === "" ? null : Number(formData.get(fieldName)));
    const teams = stages
      .map((stage) => ({ stage: stage.key, members: draft[stage.key]?.members ?? [], time: toSeconds(draft[stage.key]?.time ?? ""), score: draft[stage.key]?.score ? Number(draft[stage.key]!.score) : null }))
      .filter((team) => team.members.length > 0 || team.time !== null || team.score !== null);
    save.mutate({ modeKey: mode.key, day, result: numberField("result"), premium: numberField("premium"), detail: String(formData.get("detail") ?? "") || null, ...(stages.length ? { teams } : {}) });
  };
  return (
    <section className={`card eg-mode ${shown.current ? "" : "is-past"}`} aria-label={mode.name} id={`eg-${mode.key}`}>
      <div className="spread">
        <h3 className="row eg-mode-title">
          <SlotArt slot={artSlotKey(game.key, "mode", mode.key)} className="mode-art" />
          {mode.name}
        </h3>
        <span className="badge">{cadenceLabel(mode)}</span>
      </div>
      <div className="eg-cycle-nav">
        <button type="button" className="btn ghost sm" aria-label="Older cycle" disabled={shownIndex === rows.length - 1} onClick={() => pick(shownIndex + 1)}>
          ‹
        </button>
        <span className="font-mono">
          {cycleSpan(shown.cycleStart, shown.end)}
          {version && <span className="text-muted"> · version {version}</span>}
        </span>
        <button type="button" className="btn ghost sm" aria-label="Newer cycle" disabled={shownIndex === 0} onClick={() => pick(shownIndex - 1)}>
          ›
        </button>
        {!shown.current && (
          <button type="button" className="btn sm" onClick={() => onSelect(null)}>
            Back to now
          </button>
        )}
      </div>
      <div className="eg-window" role="img" aria-label={`Cycle ${DATE.format(from)} to ${DATE.format(to)}`}>
        <div className="eg-window-bar">
          <span style={{ width: `${done * 100}%` }} />
          {shown.current && <i style={{ left: `${done * 100}%` }} />}
        </div>
        <div className="eg-window-dates font-mono text-muted">
          <span>{SHORT_TIME.format(from)}</span>
          <span>{SHORT_TIME.format(to)}</span>
        </div>
      </div>
      <div className="kpi-value eg-result">
        <MetricIcon label={mode.metric.label} />
        {shown.result ?? "—"}
        <small>
          {" "}
          / {mode.metric.max ?? "—"} {mode.metric.label}
        </small>
      </div>
      {/* A small maximum as a row of its icons, filled up to the result (round 8). */}
      {mode.metric.max !== undefined && mode.metric.max <= 12 && (
        <span className="eg-pips" role="img" aria-label={`${shown.result ?? 0} of ${mode.metric.max} ${mode.metric.label}`}>
          {Array.from({ length: mode.metric.max }, (_, markIndex) => (
            <MetricIcon key={markIndex} label={mode.metric.label} on={markIndex < (shown.result ?? 0)} />
          ))}
        </span>
      )}
      {mode.maxPremium !== undefined && (
        <div className="eg-rewards">
          <div className="act-xp">
            <span className="kpi-label">Rewards</span>
            <span className="font-mono">
              {NUMBER_FORMAT.format(shown.premium ?? 0)} / {NUMBER_FORMAT.format(mode.maxPremium)}
            </span>
          </div>
          <div className="act-meter act-meter-thin" role="img" aria-label={`${shown.premium ?? 0} of ${mode.maxPremium} ${premium}`}>
            <span style={{ width: `${Math.min(100, ((shown.premium ?? 0) / mode.maxPremium) * 100)}%` }} />
          </div>
        </div>
      )}
      {shown.detail && !editing && <p className="eg-detail">{shown.detail}</p>}
      <div className="kpi-label eg-last-label">Last {last.length || ""} cycles</div>
      <div className="eg-last">
        {last.map((cycle) => (
          <button
            type="button"
            key={cycle.cycleStart.toISOString()}
            className={cycle === shown ? "on" : ""}
            aria-pressed={cycle === shown}
            style={{ height: `${mode.metric.max ? Math.max(4, ((cycle.result ?? 0) / mode.metric.max) * 100) : 50}%` }}
            aria-label={`Cycle of ${DATE.format(cycle.cycleStart)}: ${cycle.result ?? "—"} ${mode.metric.label}`}
            title={`${DATE.format(cycle.cycleStart)} · ${cycle.result ?? "—"} ${mode.metric.label}`}
            onClick={() => pick(rows.indexOf(cycle))}
          />
        ))}
      </div>
      {!editing && <StageLines instanceId={instanceId} gameKey={roster.gameKey} stages={stages} teams={shown.teams ?? []} unitOf={roster.unitOf} />}
      {editing ? (
        <form className="act-add" onSubmit={submit}>
          <label>
            <span>{capitalize(mode.metric.label)}</span>
            <input name="result" type="number" min={0} max={mode.metric.max} defaultValue={shown.result ?? ""} autoFocus />
          </label>
          {mode.maxPremium !== undefined && (
            <label>
              <span>{premium}</span>
              <input name="premium" type="number" min={0} max={mode.maxPremium} defaultValue={shown.premium ?? ""} />
            </label>
          )}
          <label>
            <span>Detail</span>
            <input name="detail" maxLength={80} placeholder="floor 12 · 6/9" defaultValue={shown.detail ?? ""} />
          </label>
          {stages.map((stage) => {
            const stageKey = stage.key;
            const stageDraft = draft[stageKey] ?? { members: [], time: "", score: "" };
            const set = (patch: Partial<typeof stageDraft>) => setDraft((all) => ({ ...all, [stageKey]: { ...stageDraft, ...patch } }));
            return (
              <fieldset key={stageKey} className="eg-clear-edit" aria-label={stageKey}>
                <legend className="kpi-label">
                  {stage.label}
                  {stage.level ? ` · Lv ${stage.level}` : ""}
                </legend>
                {stageDraft.members.length > 0 && (
                  <button type="button" className="btn ghost sm" aria-label={`Clear ${stageKey}`} onClick={() => set({ members: [] })}>
                    <TeamIcons gameKey={roster.gameKey} members={stageDraft.members} unitOf={roster.unitOf} /> ×
                  </button>
                )}
                {roster.units.length > 0 && (
                  <button type="button" className="btn sm" aria-label="Choose team" onClick={() => setChoosing(stageKey)}>
                    + Team
                  </button>
                )}
                {choosing === stageKey && (
                  <TeamWindow stage={stageKey} units={roster.units} teams={roster.teams} size={roster.size} members={stageDraft.members} onChange={(members) => set({ members })} onClose={() => setChoosing(null)} />
                )}
                {mode.clears?.timed && (
                  <label>
                    <span>Clear time</span>
                    <input inputMode="numeric" placeholder="m:ss" maxLength={5} value={stageDraft.time} onChange={(event) => set({ time: event.target.value })} />
                  </label>
                )}
                <label>
                  <span>Score</span>
                  <input type="number" min={0} max={1_000_000} value={stageDraft.score} onChange={(event) => set({ score: event.target.value })} />
                </label>
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
