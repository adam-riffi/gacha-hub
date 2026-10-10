import { useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, hubResets, passView, utcLabel, type GameDefinition, type PassesDto, type UserExport } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useReminderFlag, type ReminderFlag } from "../lib/reminder";
import { GameTabs } from "../components/GameTabs";
import { masked } from "../components/hub/HubHeader";
import { ReminderControl } from "../components/ReminderControl";
import type { InstanceDetail, ReminderRule, TaskItem } from "../lib/types";

const DATE = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
type Props = { instance: InstanceDetail; game: GameDefinition };

/** Saves profile fields and refreshes what shows them (the hub header, the strip, Home). */
function useProfileSave(instanceId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: object) => api.put(`/api/instances/${instanceId}`, body),
    onSuccess: () => Promise.all([["instance", instanceId], ["instances"], ["dashboard"]].map((queryKey) => qc.invalidateQueries({ queryKey }))),
    onError: () => toast("Not saved: check the value", "err"),
  });
}

/**
 * A game's Profile (WIREFRAMES.md G8): the account (server and its reset in
 * your time, UID, account and world level, typed until a linked account
 * syncs them); the passes with their expiry reminders; long-term progress
 * (with F11's sync); this game's reminders; export, sleep and remove.
 */
/** The games a linked HoYoLAB account fills (ADR 0005). */
const HOYOLAB_GAMES = ["genshin", "hsr", "zzz"];

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError) return <LoadError what="The profile" retry={() => instance.refetch()} />;
  if (!instance.data || !game) return <div className="mu">Loading…</div>;
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={instance.data.id} active="profile" gameKey={game.key} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <div className="pf-page">
        <Account instance={instance.data} game={game} />
        <Passes instance={instance.data} game={game} />
        <LongTerm instance={instance.data} game={game} />
        <GameReminders instance={instance.data} game={game} />
        <Wallet instance={instance.data} game={game} />
        <Status instance={instance.data} game={game} />
      </div>
    </>
  );
}

function Account({ instance, game }: Props) {
  const save = useProfileSave(instance.id);
  const [show, setShow] = useState(false);
  const region = game.regions.find((r) => r.key === instance.regionKey) ?? game.regions[0]!;
  const reset = hubResets(game, region, new Date()).daily;
  const level = game.manifest.accountLevel;
  const world = game.manifest.worldLevel;
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const levelRow = (name: string, field: "accountLevel" | "worldLevel", value: number | null, min: number, max: number) => (
    <div>
      <span className="kpi-label">{name}</span>
      <span className="pf-val">
        <input type="number" aria-label={name} min={min} max={max} key={value ?? ""} defaultValue={value ?? ""} onBlur={(e) => num(e.target.value) !== value && save.mutate({ [field]: num(e.target.value) })} />
      </span>
      <span className="tag">Manual</span>
    </div>
  );
  return (
    <section className="card pf-account" aria-label="Account">
      <div className="spread">
        <h3>Account</h3>
        <span className="tag">Manual</span>
      </div>
      <div className="pf-rows">
        <div>
          <span className="kpi-label">Server</span>
          <span className="pf-val">
            {region.label} · {utcLabel(region.utcOffsetMinutes)} · resets {String(region.dailyResetHour).padStart(2, "0")}:00 server time ({TIME.format(reset)} for you)
          </span>
          {game.regions.length > 1 && (
            <select aria-label="Server" value={region.key} onChange={(e) => save.mutate({ regionKey: e.target.value })}>
              {game.regions.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <span className="kpi-label">UID</span>
          <span className="pf-val">
            {instance.uid && !show ? (
              <span className="mn">{masked(instance.uid)}</span>
            ) : (
              <input
                aria-label="UID"
                key={instance.uid ?? ""}
                defaultValue={instance.uid ?? ""}
                maxLength={32}
                pattern="[A-Za-z0-9-]*"
                autoComplete="off"
                placeholder="Type your UID"
                onBlur={(e) => (e.target.value.trim() || null) !== instance.uid && save.mutate({ uid: e.target.value.trim() || null })}
              />
            )}
          </span>
          {instance.uid && <button className="btn" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>}
        </div>
        {levelRow(level.name, "accountLevel", instance.accountLevel, 1, 100)}
        {world && levelRow(world.name, "worldLevel", instance.worldLevel, 0, world.max)}
      </div>
      <p className="mu pf-note">{HOYOLAB_GAMES.includes(game.key) ? "Typed in, or filled by a linked HoYoLAB account (Settings)." : "Typed in."}</p>
    </section>
  );
}

function Passes({ instance, game }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<"monthly" | "battle" | null>(null);
  const { data } = useQuery({ queryKey: ["passes", instance.id], queryFn: () => api.get<PassesDto>(`/api/instances/${instance.id}/passes`) });
  const remindMonthly = useReminderFlag(instance.id, "beforePassEnds");
  const remindBattle = useReminderFlag(instance.id, "beforeBattlePassEnds");
  const save = useMutation({
    mutationFn: (v: { path: "monthly" | "battle"; body: object }) => api.put(`/api/instances/${instance.id}/passes/${v.path}`, v.body),
    onSuccess: () => {
      setEditing(null);
      return Promise.all([["passes", instance.id], ["dashboard"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
    },
  });
  const monthly = game.manifest.monthlyPass;
  const battle = game.manifest.battlePass;
  const region = game.regions.find((r) => r.key === instance.regionKey) ?? game.regions[0]!;
  const now = new Date();
  const pv = passView(game, region, now, data?.battle ? { ...data.battle, updatedAt: new Date(data.battle.updatedAt) } : null, data?.monthly ? { endsAt: new Date(data.monthly.endsAt) } : null);
  const submit = (path: "monthly" | "battle") => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = Number(new FormData(e.currentTarget).get("v"));
    save.mutate({ path, body: path === "monthly" ? { daysLeft: v } : { level: v, weeklyXp: pv.weeklyXp } });
  };

  const pass = (key: "monthly" | "battle", name: string, line: string, share: number, field: { label: string; value: number | null; max: number }, remind: { on: boolean; set: (v: boolean) => void; pending: boolean } | null, remindLabel: string) => (
    <div className="pf-pass">
      <div className="spread">
        <strong>{name}</strong>
        {editing === key ? (
          <form className="pf-form" onSubmit={submit(key)}>
            <label>
              {field.label}
              <input name="v" type="number" min={0} max={field.max} required defaultValue={field.value ?? ""} autoFocus />
            </label>
            <button className="btn primary" type="submit" disabled={save.isPending}>Save</button>
            <button className="btn" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </form>
        ) : (
          <span className="row">
            <span className="mn">{line}</span>
            <button className="btn" aria-label={`Update ${name}`} onClick={() => setEditing(key)}>Update</button>
          </span>
        )}
      </div>
      <span className="pf-bar"><span style={{ width: `${Math.min(1, share) * 100}%` }} /></span>
      {remind && (
        <label className="pf-check">
          <input type="checkbox" key={String(remind.on)} defaultChecked={remind.on} disabled={remind.pending} onChange={(e) => remind.set(e.target.checked)} />
          {remindLabel}
        </label>
      )}
    </div>
  );

  return (
    <section className="card pf-passes" aria-label="Passes">
      <div className="spread">
        <h3>Passes</h3>
        <span className="tag">Manual</span>
      </div>
      {!monthly && !battle && <p className="mu">No pass on record for this game.</p>}
      {monthly &&
        pass(
          "monthly",
          monthly.name,
          pv.monthlyDaysLeft === null ? "not tracked" : `${pv.monthlyDaysLeft} days left · ends ${DATE.format(new Date(data!.monthly!.endsAt))}`,
          (pv.monthlyDaysLeft ?? 0) / monthly.days,
          { label: "Days left", value: pv.monthlyDaysLeft, max: monthly.maxDays ?? monthly.days },
          remindMonthly,
          "Remind me 3 days before it ends",
        )}
      {battle &&
        pass(
          "battle",
          battle.name,
          `Lv ${pv.level}${pv.maxLevel !== null ? ` / ${pv.maxLevel}` : ""} · ends ${DATE.format(hubResets(game, region, now).versionEnd)}`,
          pv.maxLevel ? pv.level / pv.maxLevel : 0,
          { label: "Level", value: pv.level, max: battle.maxLevel ?? 200 },
          battle.maxLevel ? remindBattle : null,
          "Remind me 48 h before the end if the pass is short of its last level",
        )}
      <p className="mu pf-note">The game does not expose pass days. Re-enter after each purchase; the count runs down by itself.</p>
    </section>
  );
}

function ReminderRow({ instanceId, flag, label }: { instanceId: string; flag: ReminderFlag; label: string }) {
  const remind = useReminderFlag(instanceId, flag);
  return (
    <li className="tk-rule">
      <label>
        <input type="checkbox" key={String(remind.on)} defaultChecked={remind.on} disabled={remind.pending} onChange={(e) => remind.set(e.target.checked)} />
        {label}
      </label>
    </li>
  );
}

function GameReminders({ instance, game }: Props) {
  const { data } = useQuery({ queryKey: ["reminder", instance.id], queryFn: () => api.get<ReminderRule | null>(`/api/instances/${instance.id}/reminder`) });
  const stamina = game.currencies.find((c) => c.key === game.manifest.stamina.currency);
  const lead = data?.config.leadMinutes ?? 60;
  const rows: { flag: ReminderFlag; label: string }[] = [
    ...(stamina?.cap && stamina.regenPerHour ? [{ flag: "whenStaminaFull" as const, label: `${stamina.label} full` }] : []),
    { flag: "beforeReset", label: `Dailies left, ${lead % 60 ? `${lead} min` : `${lead / 60} h`} before reset` },
    ...(game.manifest.endgame.some((m) => m.maxPremium !== undefined) ? [{ flag: "beforeEndgameReset" as const, label: "Endgame rewards unclaimed, 24 h before its reset" }] : []),
    ...(game.key === "genshin" ? [{ flag: "includeDomains" as const, label: "Domains open today, in each DM" }] : []),
  ];
  return (
    <section className="card pf-reminders" aria-label="Game reminders">
      <div className="spread">
        <h3>Game reminders</h3>
        <Link to="/tasks">Global rules →</Link>
      </div>
      <ul className="tk-rules">
        {rows.map((r) => <ReminderRow key={r.flag} instanceId={instance.id} flag={r.flag} label={r.label} />)}
      </ul>
      <p className="mu pf-note">These switches are this game's own; Global rules on Tasks set them across games. Quiet hours still apply.</p>
      <details className="pf-more">
        <summary>More reminder options</summary>
        <ReminderControl instanceId={instance.id} hasDomains={game.key === "genshin"} />
      </details>
    </section>
  );
}

function Status({ instance, game }: Props) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useToast();
  const sleep = useProfileSave(instance.id);
  const remove = useMutation({
    mutationFn: () => api.del(`/api/instances/${instance.id}`),
    onSuccess: () => {
      toast("Game removed");
      void qc.invalidateQueries();
      nav("/library");
    },
  });
  // The old overview's tools: recreate deleted default tasks; a hidden "to max" goal per owned, unbuilt character.
  const tools = useMutation({
    mutationFn: (path: "tasks/defaults" | "backlog/generate") => api.post<{ created: number }>(`/api/instances/${instance.id}/${path}`),
    onSuccess: (r) => {
      toast(`${r.created} task${r.created === 1 ? "" : "s"} created`);
      return qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast("That did not work", "err"),
  });
  // This game's part of the account export: its profile, and the tasks on it or its builds.
  const exportJson = useMutation({
    mutationFn: () => api.get<UserExport>("/api/export"),
    onSuccess: (all) => {
      const mine = all.games.filter((g) => g.id === instance.id);
      const refs = new Set([instance.id, ...mine.flatMap((g) => g.characters.map((c) => c.id as string))]);
      const blob = new Blob([JSON.stringify({ ...all, games: mine, tasks: all.tasks.filter((t) => refs.has(t.refId as string)) }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `gacha-hub-${game.key}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    onError: () => toast("Export failed", "err"),
  });
  return (
    <section className="card pf-status" aria-label="Game status">
      <h3>Game status</h3>
      <p className="mu">
        Sleep hides the game from ALL and pauses its reminders; data stays. Remove deletes it from the library after a confirmation.
      </p>
      <span className="row">
        <button className="btn" disabled={tools.isPending} onClick={() => tools.mutate("tasks/defaults")}>Restore default tasks</button>
        {game.loadCatalog && <button className="btn" disabled={tools.isPending} onClick={() => tools.mutate("backlog/generate")}>Generate backlog</button>}
        <button className="btn" disabled={exportJson.isPending} onClick={() => exportJson.mutate()}>Export JSON</button>
        <button className="btn" disabled={sleep.isPending} onClick={() => sleep.mutate({ sleeping: !instance.sleeping })}>{instance.sleeping ? "Wake this game" : "Sleep this game"}</button>
        <button className="btn danger" disabled={remove.isPending} onClick={() => confirm(`Remove ${game.name} and all its data?`) && remove.mutate()}>Remove…</button>
      </span>
    </section>
  );
}

/** Every currency of the game, typed in place (WIREFRAMES.md G8; it lived on the old overview). */
function Wallet({ instance, game }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: (v: { key: string; value: number }) => api.put(`/api/instances/${instance.id}/currencies/${v.key}`, { value: v.value }),
    onSuccess: () => Promise.all([["instance", instance.id], ["dashboard"]].map((queryKey) => qc.invalidateQueries({ queryKey }))),
    onError: () => toast("Not saved: over the cap?", "err"),
  });
  return (
    <section className="card pf-wallet" aria-label="Wallet">
      <h3>Wallet</h3>
      <div className="pf-rows">
        {game.currencies.map((c) => {
          const value = instance.currencies.find((x) => x.key === c.key)?.value ?? 0;
          return (
            <div key={c.key}>
              <span className="kpi-label">{c.label}</span>
              <span className="pf-val">
                <input type="number" min={0} max={c.cap} aria-label={c.label} key={value} defaultValue={value} onBlur={(e) => Number(e.target.value) !== value && save.mutate({ key: c.key, value: Number(e.target.value) })} />
                {c.cap ? <span className="mu"> / {c.cap}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Long-term progress (G8): the HoYoLAB record card's stats when linked, then
 * this game's hand-typed goals, one kind for exploring, chests, events and the
 * like (Georges, 2026-10-10), added and ticked here. They are the "gameplay"
 * goals on Home and Tasks.
 */
function LongTerm({ instance, game }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  // Hand-typed: no plan, gear or event behind it, and not a plan's material step.
  const goals = (tasks.data ?? []).filter(
    (t) => t.scope === "game" && t.refId === instance.id && t.type === "goal" && !t.origin && !t.eventId && !t.parentId && !t.materialId && !t.backlog,
  );
  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks"] });
  const add = useMutation({
    mutationFn: () => api.post("/api/tasks", { scope: "game", refId: instance.id, type: "goal", title: title.trim(), target: 1, progress: 0 }),
    onSuccess: () => {
      setTitle("");
      void refresh();
    },
    onError: () => toast("Goal not added", "err"),
  });
  // A tick shows at once; the list refetches after.
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const tick = useMutation({
    mutationFn: (t: { id: string; progress: number }) => api.post(`/api/tasks/${t.id}/progress`, { progress: t.progress }),
    onSettled: () => void refresh(),
  });
  const stats = instance.progress ?? [];
  return (
    <section className="card pf-progress" aria-label="Long-term progress">
      <div className="spread">
        <h3>Long-term progress</h3>
        {stats.length > 0 && <span className="tag">From HoYoLAB</span>}
      </div>
      {stats.length > 0 && (
        <div className="pf-rows">
          {stats.map((s) => (
            <div key={s.name}>
              <span className="kpi-label">{s.name}</span>
              <span className="mn">{s.value}</span>
            </div>
          ))}
        </div>
      )}
      {goals.length > 0 ? (
        <ul className="pf-goals">
          {goals.map((t) => {
            const target = t.target ?? 1;
            return (
              <li key={t.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={ticked[t.id] ?? t.progress >= target}
                    onChange={(e) => {
                      setTicked({ ...ticked, [t.id]: e.target.checked });
                      tick.mutate({ id: t.id, progress: e.target.checked ? target : 0 });
                    }}
                  />{" "}
                  {t.title}
                </label>
                {target > 1 && <span className="mn mu">{t.progress} / {target}</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mu">
          {stats.length || !HOYOLAB_GAMES.includes(game.key) ? "" : "Link HoYoLAB in Settings for the record card's stats. "}
          Exploring, chests, events: add each as a goal.
        </p>
      )}
      <form
        className="pf-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) add.mutate();
        }}
      >
        <input aria-label="New long-term goal" placeholder="Finish exploring…" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn" type="submit" disabled={!title.trim() || add.isPending}>
          Add goal
        </button>
      </form>
    </section>
  );
}
