import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cadenceWindow, getGame, hubResets, isUrgent, type GameDefinition, type GameRegion, type TaskDto } from "@gacha/shared";
import { api } from "../lib/api";
import { formatRemaining } from "../lib/time";
import type { DashboardData, InstanceDetail } from "../lib/types";
import { GameTabs } from "../components/GameTabs";
import { Countdown } from "../components/ui";

const DATE = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const CLOCK = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** A date that matters, as a chip: paper within 48 hours (VISUAL-DESIGN.md §7). */
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
  const game = instance && getGame(instance.gameKey);
  if (!instance || !game) return <div className="muted">Loading…</div>;

  const region = game.regions.find((r) => r.key === instance.regionKey) ?? game.regions[0]!;
  const dg = dash?.games.find((g) => g.instanceId === id);
  const recurring = tasks.filter((t) => t.type === "recurring");
  const now = new Date();
  const resets = hubResets(game, region, now);
  const monthlyEnd = cadenceWindow({ cadence: "monthly", day: 1 }, region, now).end;

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="activities" gameKey={instance.gameKey} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <div className="activities">
        <Stamina game={game} instance={instance} projection={dg?.stamina ?? null} />
        <div className="act-label mn mu">By cadence</div>
        <div className="act-cadences">
          <CadenceList instanceId={id!} game={game} cadence="daily" title="Daily" items={recurring.filter((t) => (t.cadence ?? "daily") === "daily")} resetsAt={resets.daily} />
          <CadenceList instanceId={id!} game={game} cadence="weekly" title="Weekly" items={recurring.filter((t) => t.cadence === "weekly")} resetsAt={resets.weekly} />
          <CadenceList instanceId={id!} game={game} cadence="monthly" title="Monthly" items={recurring.filter((t) => t.cadence === "monthly")} resetsAt={monthlyEnd} />
        </div>
        <div className="act-bottom">
          <Cycles game={game} region={region} now={now} />
          <Version game={game} endsAt={resets.versionEnd} events={(dash?.timeline.events ?? []).filter((e) => e.gameKey === game.key && Date.parse(e.startsAt) <= now.getTime())} />
        </div>
      </div>
    </>
  );
}

function Stamina({ game, instance, projection }: { game: GameDefinition; instance: InstanceDetail; projection: DashboardData["games"][number]["stamina"] }) {
  const def = game.currencies.find((c) => c.key === game.manifest.stamina.currency);
  const reserveDef = game.currencies.find((c) => c.key === game.manifest.stamina.reserve?.currency);
  if (!def) return null;
  const value = projection?.value ?? instance.currencies.find((c) => c.key === def.key)?.value ?? 0;
  const cap = projection?.cap ?? def.cap ?? 0;
  const reserve = reserveDef ? (instance.currencies.find((c) => c.key === reserveDef.key)?.value ?? 0) : null;
  return (
    <section className="graph act-stamina" aria-label={def.label}>
      <div className="ph">
        <h3>{def.label}</h3>
        <span className="tag">Manual</span>
        <span className="sp" />
        {projection?.full ? (
          <span className="chip hot">
            <i aria-hidden="true" />
            Full
          </span>
        ) : (
          projection?.fullAt && (
            <span className="mn mu act-full">
              full at {CLOCK.format(new Date(projection.fullAt))} · in {formatRemaining(projection.fullAt)}
            </span>
          )
        )}
      </div>
      <div className="act-stamina-body">
        <div className="kpi-value">
          {Math.floor(value)}
          <small> / {cap}</small>
        </div>
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
}: {
  instanceId: string;
  game: GameDefinition;
  cadence: "daily" | "weekly" | "monthly";
  title: string;
  items: TaskDto[];
  resetsAt: Date;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const tick = useMutation({ mutationFn: ({ task, done }: { task: TaskDto; done: boolean }) => api.post(`/api/tasks/${task.id}/complete`, { done }), onSuccess: refresh });
  const add = useMutation({
    mutationFn: (body: { title: string; anchorKey?: string }) => api.post("/api/tasks", { scope: "game", refId: instanceId, type: "recurring", cadence, ...body }),
    onSuccess: () => {
      setAdding(false);
      refresh();
    },
  });
  const anchors = cadence === "monthly" ? [...game.manifest.monthlyShops, ...game.manifest.endgame.flatMap((e) => (e.anchor.cadence === "monthly" ? [{ key: e.key, name: e.name, day: e.anchor.day }] : []))] : [];
  // A monthly item resets on its own day; the list's chip shows the soonest.
  const soonest = items.map((t) => t.nextReset).filter((x): x is string => Boolean(x)).sort()[0];
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const anchorKey = String(f.get("anchor") ?? "");
    add.mutate({ title: String(f.get("title") ?? "").trim(), ...(anchorKey ? { anchorKey } : {}) });
  };
  const done = items.filter((t) => t.doneThisCycle).length;
  return (
    <section className="card act-list" aria-label={title}>
      <div className="spread">
        <h3>
          {title} <span className="mu">{done} / {items.length}</span>
        </h3>
        <Countdown at={soonest ?? resetsAt.toISOString()} kind={cadence === "daily" ? "reset" : "deadline"} prefix="resets in" />
      </div>
      <div className="act-rows">
        {items.map((t) => (
          // Uncontrolled, re-keyed on the server's state: the tick shows at once.
          <label key={`${t.id}:${String(t.doneThisCycle)}`} className={`act-row ${t.doneThisCycle ? "done" : ""}`}>
            <input type="checkbox" aria-label={t.title} defaultChecked={Boolean(t.doneThisCycle)} onChange={(e) => tick.mutate({ task: t, done: e.target.checked })} />
            <span className="act-title">{t.title}</span>
            {cadence === "monthly" && t.anchorKey && <span className="mn mu">{anchors.find((a) => a.key === t.anchorKey)?.name}</span>}
            <span className="tag">Manual</span>
          </label>
        ))}
        {items.length === 0 && <p className="mu act-empty">Nothing {title.toLowerCase()} yet.</p>}
      </div>
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
                {anchors.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name} · {ordinal(a.day)}
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

function Cycles({ game, region, now }: { game: GameDefinition; region: GameRegion; now: Date }) {
  return (
    <section className="card act-cycles" aria-label="Cycles">
      <h3>Cycles · Endgame</h3>
      <div className="act-rows">
        {game.manifest.endgame.map((e) => {
          const w = cadenceWindow(e.anchor, region, now);
          // A mode that closes before its next cycle (Stygian Onslaught) counts down to its close.
          const closes = e.openDays ? new Date(w.start.getTime() + e.openDays * 86_400_000) : w.end;
          const open = closes > now;
          return (
            <div key={e.key} className="act-row">
              <span className="act-title">{e.name}</span>
              <span className="mn mu">
                — / {e.metric.max ?? "—"} {e.metric.label}
              </span>
              {open ? <DateChip at={closes} prefix={e.openDays ? "closes " : "resets "} /> : <DateChip at={w.end} prefix="opens " />}
            </div>
          );
        })}
        {game.manifest.endgame.length === 0 && <p className="mu act-empty">No endgame mode on record yet.</p>}
      </div>
    </section>
  );
}

function Version({ game, endsAt, events }: { game: GameDefinition; endsAt: Date; events: DashboardData["timeline"]["events"] }) {
  const pass = game.manifest.battlePass;
  return (
    <section className="card act-version" aria-label={`Version ${game.manifest.version.name}`}>
      <div className="spread">
        <h3>Version {game.manifest.version.name}</h3>
        <DateChip at={endsAt} prefix="ends " />
      </div>
      <div className="act-version-body">
        <div>
          <div className="kpi-label">Battle pass</div>
          <p className="act-pass">{pass ? `${pass.name}${pass.maxLevel ? ` · ${pass.maxLevel} levels` : ""}` : "No battle pass on record."}</p>
          <p className="mu act-empty">Level and weekly XP tracking comes next.</p>
        </div>
        <div>
          <div className="kpi-label">Events</div>
          <div className="act-rows">
            {events.map((e) => (
              <div key={e.id} className="act-row">
                <span className="act-title">{e.name}</span>
                <DateChip at={new Date(e.endsAt)} />
              </div>
            ))}
            {events.length === 0 && <p className="mu act-empty">No event running.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
