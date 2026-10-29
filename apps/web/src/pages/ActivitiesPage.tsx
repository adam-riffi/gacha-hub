import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { artSlotKey, cadenceWindow, endgameNow, getGame, hubResets, isUrgent, passView, type CycleResultsDto, type GameDefinition, type PassesDto, type TaskDto } from "@gacha/shared";
import { api } from "../lib/api";
import { formatRemaining } from "../lib/time";
import type { DashboardData, InstanceDetail } from "../lib/types";
import { GameTabs } from "../components/GameTabs";
import { Countdown } from "../components/ui";
import { SegmentedBar } from "../components/charts/SegmentedBar";
import { useReminderFlag } from "../lib/reminder";
import { TickRow, tickColumn } from "../components/TickControl";
import { RedeemCodesCard } from "../components/hub/RedeemCodesCard";
import { SlotArt } from "../components/SlotArt";
import { Glyph } from "../components/Glyph";
import { officialArt } from "../lib/assets";

const DATE = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const CLOCK = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const ordinal = (value: number) => `${value}${value % 10 === 1 && value !== 11 ? "st" : value % 10 === 2 && value !== 12 ? "nd" : value % 10 === 3 && value !== 13 ? "rd" : "th"}`;

/** A date that matters, as a chip: paper within 48 hours (VISUAL-DESIGN.md §7). */
/** A task's picture slot: its shop's or mode's when it resets with one, its own for a game's default task, none for the owner's own. */
function taskSlot(game: GameDefinition, task: TaskDto): string | null {
  if (task.anchorKey) {
    if (game.manifest.monthlyShops.some((shop) => shop.key === task.anchorKey)) return artSlotKey(game.key, "shop", task.anchorKey);
    if (game.manifest.endgame.some((mode) => mode.key === task.anchorKey)) return artSlotKey(game.key, "mode", task.anchorKey);
    return null;
  }
  const seed = game.defaultTasks.find((candidate) => candidate.title === task.title && !candidate.anchorKey);
  return seed ? artSlotKey(game.key, "task", seed.key) : null;
}

function DateChip({ at, prefix = "" }: { at: Date; prefix?: string }) {
  return (
    <span className={`chip ${isUrgent(at.toISOString(), "deadline") ? "hot" : ""}`}>
      <i aria-hidden="true" />
      {prefix}
      {DATE.format(at)}
    </span>
  );
}

/**
 * A game's Activities tab (WIREFRAMES.md G1): stamina with its reserve; the
 * daily, weekly and monthly items with their resets; each endgame mode's
 * cycle; the version's end and the game's running events. Everything is
 * MANUAL until F11 brings synced data.
 */
export function ActivitiesPage() {
  const { id } = useParams<{ id: string }>();
  const { data: instance } = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks", "game", id], queryFn: () => api.get<TaskDto[]>(`/api/tasks?scope=game&refId=${id}`) });
  const { data: passes } = useQuery({ queryKey: ["passes", id], queryFn: () => api.get<PassesDto>(`/api/instances/${id}/passes`) });
  const { data: cycles } = useQuery({ queryKey: ["cycles", id], queryFn: () => api.get<CycleResultsDto>(`/api/instances/${id}/cycles`) });
  const game = instance && getGame(instance.gameKey);
  if (!instance || !game) return <div className="muted">Loading…</div>;

  const region = game.regions.find((candidate) => candidate.key === instance.regionKey) ?? game.regions[0]!;
  const dashGame = dash?.games.find((candidate) => candidate.instanceId === id);
  const recurring = tasks.filter((task) => task.type === "recurring");
  const now = new Date();
  const resets = hubResets(game, region, now);
  const monthlyEnd = cadenceWindow({ cadence: "monthly", day: 1 }, region, now).end;
  const passState = passView(
    game,
    region,
    now,
    passes?.battle ? { ...passes.battle, updatedAt: new Date(passes.battle.updatedAt) } : null,
    passes?.monthly ? { endsAt: new Date(passes.monthly.endsAt) } : null,
  );

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="activities" gameKey={instance.gameKey} />
      </div>
      <div className="activities">
        <Stamina game={game} instance={instance} projection={dashGame?.stamina ?? null} />
        <div className="act-cadences">
          <CadenceList instanceId={id!} game={game} cadence="daily" title="Daily" items={recurring.filter((task) => (task.cadence ?? "daily") === "daily")} resetsAt={resets.daily} />
          <CadenceList instanceId={id!} game={game} cadence="weekly" title="Weekly" items={recurring.filter((task) => task.cadence === "weekly")} resetsAt={resets.weekly} />
          <CadenceList instanceId={id!} game={game} cadence="monthly" title="Monthly" items={recurring.filter((task) => task.cadence === "monthly")} resetsAt={monthlyEnd}>
            {game.manifest.monthlyPass && <MonthlyPass instanceId={id!} gameKey={game.key} name={game.manifest.monthlyPass.name} daysLeft={passState.monthlyDaysLeft} />}
          </CadenceList>
        </div>
        <div className="act-bottom">
          <Cycles game={game} modes={endgameNow(game, region, now, (cycles?.results ?? []).map((result) => ({ ...result, cycleStart: new Date(result.cycleStart) }))).modes} instanceId={id!} />
          <Version instanceId={id!} game={game} passState={passState} endsAt={resets.versionEnd} events={(dash?.timeline.events ?? []).filter((event) => event.gameKey === game.key && Date.parse(event.startsAt) <= now.getTime())} />
        </div>
        <RedeemCodesCard instanceId={id!} gameKey={game.key} />
      </div>
    </>
  );
}

function Stamina({ game, instance, projection }: { game: GameDefinition; instance: InstanceDetail; projection: DashboardData["games"][number]["stamina"] }) {
  const remind = useReminderFlag(instance.id, "whenStaminaFull");
  const staminaCurrency = game.currencies.find((currency) => currency.key === game.manifest.stamina.currency);
  const reserveDef = game.currencies.find((currency) => currency.key === game.manifest.stamina.reserve?.currency);
  if (!staminaCurrency) return null;
  const value = projection?.value ?? instance.currencies.find((held) => held.key === staminaCurrency.key)?.value ?? 0;
  const cap = projection?.cap ?? staminaCurrency.cap ?? 0;
  const reserve = reserveDef ? (instance.currencies.find((held) => held.key === reserveDef.key)?.value ?? 0) : null;
  return (
    <section className="graph act-stamina" aria-label={staminaCurrency.label}>
      <div className="ph">
        <h3>{staminaCurrency.label}</h3>
        <span className="sp" />
      </div>
      <label className="act-remind">
        <input type="checkbox" key={String(remind.on)} defaultChecked={remind.on} disabled={remind.pending} onChange={(event) => remind.set(event.target.checked)} />
        Remind when full
      </label>
      <div className="act-stamina-body">
        <div className="kpi-value">
          {Math.floor(value)}
          <small> / {cap}</small>
        </div>
        {/* The state beside the figure (round 25): FULL large, or when it fills. */}
        {projection?.full ? (
          <span className="act-full-mark">Full</span>
        ) : (
          projection?.fullAt && (
            <span className="font-mono text-muted act-full act-full-at">
              full at {CLOCK.format(new Date(projection.fullAt))} · in {formatRemaining(projection.fullAt)}
            </span>
          )
        )}
        <div className="act-meter" role="img" aria-label={`${Math.floor(value)} of ${cap}`}>
          <span style={{ width: `${cap > 0 ? Math.min(100, (value / cap) * 100) : 0}%` }} />
        </div>
        {reserveDef && (
          <div className="kpi act-reserve">
            <div className="kpi-label">{reserveDef.label}</div>
            <div className="kpi-value">
              {reserve}
              <small> / {reserveDef.cap}</small>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CadenceList({
  instanceId,
  game,
  cadence,
  title,
  items,
  resetsAt,
  children,
}: {
  instanceId: string;
  game: GameDefinition;
  cadence: "daily" | "weekly" | "monthly";
  title: string;
  items: TaskDto[];
  resetsAt: Date;
  children?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const add = useMutation({
    mutationFn: (body: { title: string; anchorKey?: string }) => api.post("/api/tasks", { scope: "game", refId: instanceId, type: "recurring", cadence, ...body }),
    onSuccess: () => {
      setAdding(false);
      refresh();
    },
  });
  const anchors = cadence === "monthly" ? [...game.manifest.monthlyShops, ...game.manifest.endgame.flatMap((endgameMode) => (endgameMode.anchor.cadence === "monthly" ? [{ key: endgameMode.key, name: endgameMode.name, day: endgameMode.anchor.day }] : []))] : [];
  // A monthly item resets on its own day; the list's chip shows the soonest.
  const soonest = items.map((item) => item.nextReset).filter((resetAt): resetAt is string => Boolean(resetAt)).sort()[0];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const anchorKey = String(formData.get("anchor") ?? "");
    add.mutate({ title: String(formData.get("title") ?? "").trim(), ...(anchorKey ? { anchorKey } : {}) });
  };
  const done = items.filter((item) => item.doneThisCycle).length;
  return (
    <section className="card act-list" aria-label={title}>
      <div className="spread">
        <h3>
          {title} <span className="text-muted">{done} / {items.length}</span>
        </h3>
        <Countdown at={soonest ?? resetsAt.toISOString()} kind={cadence === "daily" ? "reset" : "deadline"} prefix="resets in" />
      </div>
      <div className="act-rows" style={tickColumn(items)}>
        {/* One tick control everywhere (round 7): a counted daily by its steps. */}
        {items.map((item) => (
          <TickRow key={item.id} instanceId={instanceId} task={item} icon={<SlotArt slot={taskSlot(game, item)} className="list-art" fallback={<Glyph kind="task" label="" className="list-art list-art-glyph" />} />}>
            {cadence === "monthly" && item.anchorKey && anchors.find((anchor) => anchor.key === item.anchorKey)?.name !== item.title && <span className="font-mono text-muted">{anchors.find((anchor) => anchor.key === item.anchorKey)?.name}</span>}
          </TickRow>
        ))}
        {items.length === 0 && <p className="text-muted act-empty">Nothing {title.toLowerCase()} yet.</p>}
      </div>
      {children}
      {adding ? (
        <form className="act-add" onSubmit={submit}>
          <label>
            <span>Title</span>
            <input name="title" required maxLength={200} autoFocus />
          </label>
          {cadence === "monthly" && (
            <label>
              <span>Resets with</span>
              <select name="anchor" defaultValue={anchors[0]?.key ?? ""}>
                {anchors.map((anchor) => (
                  <option key={anchor.key} value={anchor.key}>
                    {anchor.name} · {ordinal(anchor.day)}
                  </option>
                ))}
                <option value="">The 1st of the month</option>
              </select>
            </label>
          )}
          <button type="submit" className="btn primary" disabled={add.isPending}>
            Add
          </button>
          <button type="button" className="btn" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" className="btn act-add-btn" onClick={() => setAdding(true)}>
          Add a {title.toLowerCase()}
        </button>
      )}
    </section>
  );
}

function Cycles({ game, modes, instanceId }: { game: GameDefinition; modes: ReturnType<typeof endgameNow>["modes"]; instanceId: string }) {
  return (
    <section className="card act-cycles" aria-label="Cycles">
      <div className="spread">
        <h3>Cycles · Endgame</h3>
        <Link className="btn" to={`/games/${instanceId}/endgame`}>
          Open endgame
        </Link>
      </div>
      <div className="act-rows">
        {modes.map(({ mode: endgameMode, result, closes, open, end }) => (
          // A mode that closes before its next cycle (Stygian Onslaught) counts down to its close.
          <div key={endgameMode.key} className="act-row">
            <span className="act-title">
              <SlotArt slot={artSlotKey(game.key, "mode", endgameMode.key)} className="list-art" />
              {endgameMode.name}
            </span>
            <span className="font-mono text-muted">
              {result ?? "—"} / {endgameMode.metric.max ?? "—"} {endgameMode.metric.label}
            </span>
            {open ? <DateChip at={closes} prefix={endgameMode.openDays ? "closes " : "resets "} /> : <DateChip at={end} prefix="opens " />}
          </div>
        ))}
        {game.manifest.endgame.length === 0 && <p className="text-muted act-empty">No endgame mode on record yet.</p>}
      </div>
    </section>
  );
}

type PassView = ReturnType<typeof passView>;
const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");

/** Invalidate what a pass change touches. */
function usePassSave(instanceId: string, path: string, close: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => api.put(`/api/instances/${instanceId}/passes/${path}`, body),
    onSuccess: () => {
      close();
      queryClient.invalidateQueries({ queryKey: ["passes", instanceId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** The 30-day pass under the monthly items: its days left, typed in place. */
function MonthlyPass({ instanceId, gameKey, name, daysLeft }: { instanceId: string; gameKey: string; name: string; daysLeft: number | null }) {
  const [editing, setEditing] = useState(false);
  const save = usePassSave(instanceId, "monthly", () => setEditing(false));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate({ daysLeft: Number(new FormData(event.currentTarget).get("days")) });
  };
  return editing ? (
    <form className="act-add" onSubmit={submit}>
      <label>
        <span>Days left</span>
        <input name="days" type="number" min={0} max={365} required defaultValue={daysLeft ?? ""} autoFocus />
      </label>
      <button type="submit" className="btn primary" disabled={save.isPending}>
        Save
      </button>
      <button type="button" className="btn" onClick={() => setEditing(false)}>
        Cancel
      </button>
      {save.isError && <span className="hub-error">Not saved: over the pass's limit.</span>}
    </form>
  ) : (
    <div className="act-row act-pass-row">
      <span className="act-title">
        <SlotArt slot={artSlotKey(gameKey, "monthly-pass")} className="list-art" />
        {name}
      </span>
      <span className="font-mono">{daysLeft === null ? "not tracked" : `${daysLeft} days left`}</span>
      <button type="button" className="btn" aria-label={`Update ${name}`} onClick={() => setEditing(true)}>
        Update
      </button>
    </div>
  );
}

function Version({ instanceId, game, passState, endsAt, events }: { instanceId: string; game: GameDefinition; passState: PassView; endsAt: Date; events: DashboardData["timeline"]["events"] }) {
  const pass = game.manifest.battlePass;
  const [editing, setEditing] = useState(false);
  const save = usePassSave(instanceId, "battle", () => setEditing(false));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    save.mutate({ level: Number(formData.get("level")), weeklyXp: Number(formData.get("xp") || 0) });
  };
  return (
    <section className="card act-version" aria-label={`Version ${game.manifest.version.name}`}>
      <div className="spread">
        <h3>Version {game.manifest.version.name}</h3>
        <DateChip at={endsAt} prefix="ends " />
      </div>
      <div className="act-version-body">
        <div>
          <div className="spread act-pass-head">
            <div className="kpi-label">Battle pass</div>
            {pass && (
              <span className="font-mono text-muted row">
                <SlotArt slot={artSlotKey(game.key, "battle-pass")} className="pass-art" />
                {pass.name}
              </span>
            )}
          </div>
          {!pass && <p className="text-muted act-empty">No battle pass on record.</p>}
          {pass &&
            (editing ? (
              <form className="act-add" onSubmit={submit}>
                <label>
                  <span>Level</span>
                  <input name="level" type="number" min={0} max={pass.maxLevel ?? 200} required defaultValue={passState.level} autoFocus />
                </label>
                <label>
                  <span>Weekly XP</span>
                  <input name="xp" type="number" min={0} max={pass.weeklyXpCap ?? 1_000_000} defaultValue={passState.weeklyXp} />
                </label>
                <button type="submit" className="btn primary" disabled={save.isPending}>
                  Save
                </button>
                <button type="button" className="btn" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                {save.isError && <span className="hub-error">Not saved: over the pass's caps.</span>}
              </form>
            ) : (
              <>
                <div className="act-pass-level">
                  <div className="kpi-value">
                    {passState.level}
                    {passState.maxLevel !== null && <small> / {passState.maxLevel}</small>}
                  </div>
                  {passState.levelsPerDay !== null && (
                    <span className="font-mono text-muted">
                      {passState.levelsPerDay.toFixed(1)} {passState.levelsPerDay === 1 ? "level" : "levels"} a day to finish
                    </span>
                  )}
                </div>
                {passState.maxLevel !== null && <SegmentedBar level={passState.level} max={passState.maxLevel} label={pass.name} />}
                <div className="act-xp">
                  <span className="kpi-label">Weekly XP</span>
                  <span className="font-mono">
                    {NUMBER_FORMAT.format(passState.weeklyXp)}
                    {passState.weeklyXpCap !== null && ` / ${NUMBER_FORMAT.format(passState.weeklyXpCap)}`}
                  </span>
                </div>
                {passState.weeklyXpCap !== null && (
                  <div className="act-meter act-meter-thin" role="img" aria-label={`Weekly XP ${passState.weeklyXp} of ${passState.weeklyXpCap}`}>
                    <span style={{ width: `${Math.min(100, (passState.weeklyXp / passState.weeklyXpCap) * 100)}%` }} />
                  </div>
                )}
                <button type="button" className="btn act-add-btn" aria-label="Update the battle pass" onClick={() => setEditing(true)}>
                  Update
                </button>
              </>
            ))}
        </div>
        <div>
          <div className="kpi-label">Events</div>
          <div className="act-rows">
            {events.map((event) => (
              <div key={event.id} className="act-row">
                {/* The event's official picture (round 17), when its feed gave one. */}
                {officialArt(event.payload) && <img className="act-thumb" src={officialArt(event.payload)} alt="" loading="lazy" />}
                <span className="act-title">{event.name}</span>
                <DateChip at={new Date(event.endsAt)} />
              </div>
            ))}
            {events.length === 0 && <p className="text-muted act-empty">No event running.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
