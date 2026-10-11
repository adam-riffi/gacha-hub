import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endgameNow, getGame, passView, pullsFor, skillsField, weaponHolder, type BannerDto, type CharacterDto, type CycleResultsDto, type GameDefinition, type PassesDto, type TaskDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { formatRemaining } from "../lib/time";
import { GameTabs } from "../components/GameTabs";
import { CatalogIcon } from "../components/CatalogIcon";
import { useCatalog } from "../lib/catalog";
import type { DashboardData, InstanceDetail } from "../lib/types";

type DashGame = DashboardData["games"][number];

/**
 * A game's Overview (Georges's designs of 2026-10-11, WIREFRAMES.md G0): the
 * hub's landing screen, what this one game needs at a glance and nothing else.
 * Each card opens its screen.
 */
export function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const tasks = useQuery({ queryKey: ["tasks", "game", id], queryFn: () => api.get<TaskDto[]>(`/api/tasks?scope=game&refId=${id}`) });
  const passes = useQuery({ queryKey: ["passes", id], queryFn: () => api.get<PassesDto>(`/api/instances/${id}/passes`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const cycles = useQuery({ queryKey: ["cycles", id], queryFn: () => api.get<CycleResultsDto>(`/api/instances/${id}/cycles`) });
  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || dash.isError) return <LoadError what="The overview" retry={() => Promise.all([instance.refetch(), dash.refetch()])} />;
  const g = dash.data?.games.find((x) => x.instanceId === id);
  if (!instance.data || !game || !dash.data || !g) return <div className="mu">Loading…</div>;
  const banners = dash.data.timeline.banners.filter((b) => b.gameKey === game.key);
  const recurring = (tasks.data ?? []).filter((t) => t.type === "recurring");
  const region = game.regions.find((r) => r.key === instance.data.regionKey) ?? game.regions[0]!;
  const battle = passes.data?.battle;
  const pv = passView(game, region, new Date(), battle ? { ...battle, updatedAt: new Date(battle.updatedAt) } : null, null);

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="overview" gameKey={game.key} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <div className="ov-grid">
        {game.pullBanners?.length ? (
          <>
            <PullsCard g={g} instanceId={id!} />
            <PityCard g={g} game={game} instanceId={id!} />
          </>
        ) : null}
        <BannersCard banners={banners} game={game} />
        <TodayCard instanceId={id!} game={game} items={recurring.filter((t) => t.cadence === "daily")} />
        <WeeklyCard instanceId={id!} game={game} pv={pv} items={recurring.filter((t) => t.cadence === "weekly")} />
        <StaminaCard g={g} game={game} instance={instance.data} />
        <BuildsCard instanceId={id!} game={game} builds={(builds.data ?? []).filter((b) => b.buildStatus === "building" || b.buildStatus === "good")} />
        <EndgameCard instanceId={id!} game={game} region={region} cycles={cycles.data} />
        <GoalsCard gameKey={game.key} tasks={tasks.data ?? []} />
        <BacklogCard g={g} tasks={tasks.data ?? []} />
        <OwnCard game={game} instance={instance.data} tasks={tasks.data ?? []} />
      </div>
    </>
  );
}

/** A card's title, linking to its screen. */
function Head({ title, to, children }: { title: string; to?: string; children?: ReactNode }) {
  return (
    <div className="ov-head">
      <h3>{to ? <Link to={to}>{title}</Link> : title}</h3>
      {children}
    </div>
  );
}

/** Limited pulls on hand: the total, then what makes it (tickets, and the premium currency in pulls). */
function PullsCard({ g, instanceId }: { g: DashGame; instanceId: string }) {
  const rows = g.currencies.filter((c) => c.pullCost && !c.standardOnly && !c.onlyFor);
  return (
    <section className="card ov-card" aria-label="Pulls">
      <Head title="Pulls" to={`/games/${instanceId}/pulls`} />
      <div className="ov-big" data-testid="pulls-total">
        {pullsFor(g.currencies).limited}
      </div>
      <dl className="ov-rows">
        {rows.map((c) => (
          <div key={c.key}>
            <dt>{c.pullCost! > 1 ? `From ${c.label}` : c.label}</dt>
            <dd>{Math.floor(c.value / c.pullCost!)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Each banner type's pity, and whether the next top pull is the featured one. */
function PityCard({ g, game, instanceId }: { g: DashGame; game: GameDefinition; instanceId: string }) {
  return (
    <section className="card ov-card" aria-label="Pity">
      <Head title="Pity" to={`/games/${instanceId}/pulls`} />
      <dl className="ov-rows">
        {g.pity.map((p) => {
          // The featured unit's share, as the game says it: 50/50, 75/25.
          const rate = game.pullBanners?.find((b) => b.key === p.key)?.featuredRate ?? 1;
          const featured = rate < 1;
          const split = `${Math.round(rate * 100)}/${100 - Math.round(rate * 100)}`;
          return (
            <div key={p.key}>
              <dt>{p.label}</dt>
              <dd>
                {p.pity}/{p.hardPity}
                {featured && <span className={p.guaranteed ? "ov-hot" : "mu"}> · {p.guaranteed ? "guaranteed" : split}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/** The game's banner phases, the current one and the next; the arrows step through them. */
function BannersCard({ banners, game }: { banners: BannerDto[]; game: GameDefinition }) {
  // The page's moment, read once: "ends in" counts from when it opened.
  const [now] = useState(() => Date.now());
  const phases = [...new Set(banners.map((b) => b.startsAt))]
    .sort()
    .map((start) => banners.filter((b) => b.startsAt === start));
  const current = Math.max(0, phases.findIndex((p) => p.some((b) => new Date(b.endsAt).getTime() > now)));
  const [at, setAt] = useState<number | null>(null);
  const k = Math.min(at ?? current, Math.max(0, phases.length - 1));
  const top = game.topRarity ?? 5;
  const when = (p: BannerDto[]) => {
    const start = new Date(p[0]!.startsAt).getTime();
    const end = Math.min(...p.map((b) => new Date(b.endsAt).getTime()));
    return start > now ? `starts in ${formatRemaining(p[0]!.startsAt, now)}` : end > now ? `ends in ${formatRemaining(new Date(end).toISOString(), now)}` : "ended";
  };
  return (
    <section className="card ov-card" aria-label="Banners">
      <Head title="Banners" to="/timeline">
        <span className="ov-arrows">
          <button className="btn ghost sm" aria-label="Earlier banners" disabled={k === 0} onClick={() => setAt(k - 1)}>
            ◀
          </button>
          <button className="btn ghost sm" aria-label="Later banners" disabled={k >= phases.length - 2} onClick={() => setAt(k + 1)}>
            ▶
          </button>
        </span>
      </Head>
      {phases.length === 0 && <p className="mu">None</p>}
      {phases.slice(k, k + 2).map((p) => {
        const units = p.flatMap((b) => b.featured.filter((f) => !f.rarity || f.rarity >= top));
        return (
          <div key={p[0]!.startsAt} className="ov-phase">
            <span className="ov-units">
              {units.map((f) => (
                <CatalogIcon key={f.catalogId} gameKey={game.key} kind={f.kind} icon={f.icon} name={f.name ?? f.catalogId} />
              ))}
              {units.length === 0 && <span>{p.map((b) => b.name).join(" · ")}</span>}
            </span>
            <span className="mn">{when(p)}</span>
          </div>
        );
      })}
    </section>
  );
}

/**
 * A recurring task's box, ticked in place; a counted one (four commissions,
 * three weekly bosses) has a box per step, and a click ticks up to that one
 * (or back, on the last ticked). Over eight steps it is a number to type.
 */
function TickBox({ instanceId, task }: { instanceId: string; task: TaskDto }) {
  const qc = useQueryClient();
  const refresh = () => Promise.all([["tasks", "game", instanceId], ["tasks"], ["dashboard"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
  const tick = useMutation({ mutationFn: (done: boolean) => api.post(`/api/tasks/${task.id}/complete`, { done }), onSuccess: refresh });
  const step = useMutation({ mutationFn: (progress: number) => api.post(`/api/tasks/${task.id}/progress`, { progress }), onSuccess: refresh });
  const n = task.target ?? 1;
  if (n > 8) {
    return (
      <span className="ov-count">
        <input type="number" min={0} max={n} aria-label={task.title} key={task.progress} defaultValue={task.progress} onBlur={(e) => Number(e.target.value) !== task.progress && step.mutate(Math.min(n, Math.max(0, Number(e.target.value))))} />
        <span className="mu"> / {n}</span>
      </span>
    );
  }
  if (n > 1) {
    return (
      <span className="ov-steps" role="group" aria-label={task.title}>
        {Array.from({ length: n }, (_, i) => (
          <button key={i} type="button" className="ov-step" aria-label={`${i + 1} of ${n}`} aria-pressed={i < task.progress} onClick={() => step.mutate(task.progress === i + 1 ? i : i + 1)} />
        ))}
      </span>
    );
  }
  return <input type="checkbox" className="ov-tick" aria-label={task.title} key={String(task.doneThisCycle)} defaultChecked={Boolean(task.doneThisCycle)} onChange={(e) => tick.mutate(e.target.checked)} />;
}

/**
 * A row per recurring task, its box ticked in place; then the game's own
 * dailies or weeklies the profile lacks (it was made before they joined),
 * each added with +.
 */
function Ticks({ instanceId, items, game, cadence }: { instanceId: string; items: TaskDto[]; game?: GameDefinition; cadence?: "daily" | "weekly" }) {
  const qc = useQueryClient();
  const restore = useMutation({
    mutationFn: () => api.post(`/api/instances/${instanceId}/tasks/defaults`, {}),
    onSuccess: () => Promise.all([["tasks", "game", instanceId], ["tasks"]].map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
  const have = new Set(items.map((t) => t.title.toLowerCase()));
  const missing = (game?.defaultTasks ?? []).filter((t) => t.cadence === cadence && !have.has(t.title.toLowerCase()));
  return (
    <>
      {items.map((t) => (
        <div key={t.id}>
          <dt>{t.title}</dt>
          <dd>
            <TickBox instanceId={instanceId} task={t} />
          </dd>
        </div>
      ))}
      {missing.map((t) => (
        <div key={t.key}>
          <dt className="mu">{t.title}</dt>
          <dd>
            <button className="btn ghost sm" aria-label={`Add ${t.title}`} disabled={restore.isPending} onClick={() => restore.mutate()}>
              +
            </button>
          </dd>
        </div>
      ))}
    </>
  );
}

/** Today's dailies, each a box ticked in place. */
function TodayCard({ instanceId, game, items }: { instanceId: string; game: GameDefinition; items: TaskDto[] }) {
  return (
    <section className="card ov-card" aria-label="Today">
      <Head title="Today" to={`/games/${instanceId}/activities`} />
      <dl className="ov-rows">
        <Ticks instanceId={instanceId} items={items} game={game} cadence="daily" />
      </dl>
      {items.length === 0 && !game.defaultTasks.some((t) => t.cadence === "daily") && <p className="mu">None</p>}
    </section>
  );
}

/** The battle pass (its level, this week's XP) and the weeklies. */
function WeeklyCard({ instanceId, game, pv, items }: { instanceId: string; game: GameDefinition; pv: ReturnType<typeof passView>; items: TaskDto[] }) {
  const name = game.manifest.battlePass ? `${game.manifest.battlePass.name} and weekly` : "Weekly";
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k` : String(n));
  return (
    <section className="card ov-card" aria-label={name}>
      <Head title={name} to={`/games/${instanceId}/activities`} />
      <dl className="ov-rows">
        {game.manifest.battlePass && (
          <div>
            <dt>Level</dt>
            <dd>
              {pv.level}
              {pv.maxLevel !== null && `/${pv.maxLevel}`}
            </dd>
          </div>
        )}
        {pv.weeklyXpCap !== null && (
          <div>
            <dt>Weekly EXP</dt>
            <dd>
              {k(pv.weeklyXp)} / {k(pv.weeklyXpCap)}
            </dd>
          </div>
        )}
        <Ticks instanceId={instanceId} items={items} game={game} cadence="weekly" />
      </dl>
    </section>
  );
}

/** The game's stamina projected to now, when it is full, and its reserve. */
function StaminaCard({ g, game, instance }: { g: DashGame; game: GameDefinition; instance: InstanceDetail }) {
  const def = game.currencies.find((c) => c.key === game.manifest.stamina.currency);
  const reserveDef = game.currencies.find((c) => c.key === game.manifest.stamina.reserve?.currency);
  if (!def || !g.stamina) return null;
  const reserve = reserveDef ? (instance.currencies.find((c) => c.key === reserveDef.key)?.value ?? 0) : null;
  return (
    <section className="card ov-card" aria-label={def.label}>
      <Head title={def.label} to={`/games/${instance.id}/activities`} />
      <div className="ov-big" data-testid="stamina">
        {Math.floor(g.stamina.value)}
        <small> / {g.stamina.cap}</small>
      </div>
      <dl className="ov-rows">
        {g.stamina.full || !g.stamina.fullAt ? (
          <div>
            <dt>Full</dt>
            <dd className="ov-hot">now</dd>
          </div>
        ) : (
          <div>
            <dt>Full in</dt>
            <dd>{formatRemaining(g.stamina.fullAt)}</dd>
          </div>
        )}
        {reserveDef && (
          <div>
            <dt>{reserveDef.label}</dt>
            <dd>
              {reserve}
              {reserveDef.cap && ` / ${reserveDef.cap}`}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

const DAY = 86_400_000;
type Doc = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" ? v : null);

/** Builds being worked on: level, skills, weapon level, and a square per gear slot filled. */
function BuildsCard({ instanceId, game, builds }: { instanceId: string; game: GameDefinition; builds: CharacterDto[] }) {
  const { index } = useCatalog(game.key);
  const skills = skillsField(game);
  const holder = weaponHolder(game);
  const gear = game.manifest.gear;
  return (
    <section className="card ov-card is-wide" aria-label="Builds in progress">
      <Head title="Builds in progress" to={`/games/${instanceId}/characters`} />
      {builds.length === 0 ? (
        <p className="mu">None</p>
      ) : (
        <div className="ov-scroll">
          <table className="ov-table">
            <thead>
              <tr>
                <th>Character</th>
                <th>Level</th>
                <th>Skills</th>
                <th>{holder ? "Weapon" : ""}</th>
                <th>{gear.name}</th>
              </tr>
            </thead>
            <tbody>
              {builds.map((b) => {
                const doc = (b.doc ?? {}) as Doc;
                const unit = b.catalogId ? index?.characters.get(b.catalogId) : undefined;
                const levels = Object.values((doc[skills] ?? {}) as Doc).filter((v): v is number => typeof v === "number");
                const pieces = (doc[gear.field] ?? {}) as Record<string, Doc | undefined>;
                return (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/characters/${b.id}`} className="ov-unit">
                        <CatalogIcon gameKey={game.key} kind="character" icon={unit?.icon} name={unit?.name ?? b.name} tag={unit?.tag} />
                        {unit?.name ?? b.name}
                      </Link>
                    </td>
                    <td className="mn">{num(doc.level) ?? "—"}</td>
                    <td className="mn">{levels.length ? levels.join("·") : "—"}</td>
                    <td className="mn">{holder ? (num((doc[holder] as Doc | undefined)?.level) ?? "—") : ""}</td>
                    <td>
                      <span className="ov-squares" role="img" aria-label={`${gear.slots.filter((s) => pieces[s.key]?.setName || pieces[s.key]?.mainStat).length} of ${gear.slots.length} ${gear.name}`}>
                        {gear.slots.map((s) => (
                          <i key={s.key} className={pieces[s.key]?.setName || pieces[s.key]?.mainStat ? "on" : ""} />
                        ))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Each endgame mode's current cycle: its result over its best, and when it resets. */
function EndgameCard({ instanceId, game, region, cycles }: { instanceId: string; game: GameDefinition; region: GameDefinition["regions"][number]; cycles?: CycleResultsDto }) {
  const [now] = useState(() => new Date());
  if (game.manifest.endgame.length === 0) return null;
  const results = (cycles?.results ?? []).map((r) => ({ ...r, cycleStart: new Date(r.cycleStart) }));
  const eg = endgameNow(game, region, now, results);
  const unit = (label: string) => (label === "stars" ? "★" : ` ${label}`);
  return (
    <section className="card ov-card" aria-label="Endgame · cycle">
      <Head title="Endgame · cycle" to={`/games/${instanceId}/endgame`} />
      <table className="ov-table">
        <thead>
          <tr>
            <th>Mode</th>
            <th>Progress</th>
            <th>Resets</th>
          </tr>
        </thead>
        <tbody>
          {eg.modes.map((m) => {
            const at = m.open ? m.closes : m.end;
            const days = Math.ceil((at.getTime() - now.getTime()) / DAY);
            return (
              <tr key={m.mode.key}>
                <td>{m.mode.name}</td>
                <td className="mn">{m.result === null ? "—" : `${m.result}${m.mode.metric.max !== undefined ? `/${m.mode.metric.max}` : ""}${unit(m.mode.metric.label)}`}</td>
                <td className="mn">{days > 1 ? `${days}d` : formatRemaining(at.toISOString(), now.getTime())}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/** A goal's progress, 0 to 1: its material steps met, its checklist ticked, or its count over its target. */
function progressOf(t: TaskDto, all: TaskDto[]) {
  const kids = all.filter((k) => k.parentId === t.id && k.materialId);
  if (kids.length) return kids.filter((k) => k.progress >= (k.target ?? 0)).length / kids.length;
  if (t.items?.length) return t.items.filter((i) => i.done).length / t.items.length;
  return t.target ? Math.min(1, t.progress / t.target) : t.lastCompletedAt ? 1 : 0;
}
const topGoals = (tasks: TaskDto[]) => tasks.filter((t) => !t.parentId && t.type !== "recurring");

/** The game's active goals with their progress, and their average as a ring. */
function GoalsCard({ gameKey, tasks }: { gameKey: string; tasks: TaskDto[] }) {
  const goals = topGoals(tasks)
    .filter((t) => !t.backlog)
    .map((t) => ({ t, p: progressOf(t, tasks) }))
    .sort((a, b) => b.p - a.p);
  const avg = goals.length ? goals.reduce((s, g) => s + g.p, 0) / goals.length : 0;
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <section className="card ov-card is-wide" aria-label="Goals">
      <Head title="Goals" to={`/tasks?game=${gameKey}`} />
      <div className="ov-goals">
        <svg viewBox="0 0 84 84" className="ov-ring" role="img" aria-label={`${Math.round(avg * 100)}% done on average`}>
          <circle cx="42" cy="42" r={R} className="ov-ring-track" />
          <circle cx="42" cy="42" r={R} className="ov-ring-fill" strokeDasharray={`${avg * C} ${C}`} transform="rotate(-90 42 42)" />
          <text x="42" y="47" textAnchor="middle">
            {Math.round(avg * 100)}%
          </text>
        </svg>
        <div className="ov-scroll">
          <table className="ov-table">
            <tbody>
              {goals.map(({ t, p }) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/tasks?game=${gameKey}`}>{t.title}</Link>
                  </td>
                  <td className="mn num">{Math.round(p * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {goals.length === 0 && <p className="mu">None</p>}
        </div>
      </div>
    </section>
  );
}

/** The goals still open (the backlog included), and how many there were each of the last ten days. */
function BacklogCard({ g, tasks }: { g: DashGame; tasks: TaskDto[] }) {
  const open = topGoals(tasks).filter((t) => progressOf(t, tasks) < 1).length;
  const days = g.days.slice(-10).map((d) => d.goalsOpen);
  const max = Math.max(1, ...days, open);
  const pts = days.map((v, i) => `${days.length > 1 ? (i * 160) / (days.length - 1) : 80},${36 - (v / max) * 32}`).join(" ");
  return (
    <section className="card ov-card" aria-label="Backlog">
      <Head title="Backlog" to={`/tasks?game=${g.gameKey}`} />
      <div className="ov-backlog">
        <span className="ov-big" data-testid="open">
          {open}
        </span>
        {days.length > 1 && (
          <svg viewBox="0 0 160 40" className="ov-spark" role="img" aria-label={`Open goals, last ${days.length} days: ${days.join(", ")}`}>
            <polyline points={pts} />
          </svg>
        )}
      </div>
      <span className="mn mu">open, last 10 days</span>
    </section>
  );
}

type OwnCardItem = NonNullable<GameDefinition["manifest"]["ownCard"]>["items"][number];
/** A cap that follows another value by steps: the last step reached. */
const capBy = (by: Extract<OwnCardItem, { currency: string }>["capBy"], v: number) => by?.steps.reduce((cap, [at, c]) => (v >= at ? c : cap), by.steps[0]![1]);

/**
 * The game's own card (its manifest's `ownCard`; Georges's designs: NTE's
 * city, Endfield's AIC and outposts): its currencies typed in place, its
 * dailies as boxes; a daily the profile lacks is added from here.
 */
function OwnCard({ game, instance, tasks }: { game: GameDefinition; instance: InstanceDetail; tasks: TaskDto[] }) {
  const qc = useQueryClient();
  const refresh = (keys: unknown[][]) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
  const set = useMutation({
    mutationFn: (v: { key: string; value: number }) => api.put(`/api/instances/${instance.id}/currencies/${v.key}`, { value: v.value }),
    onSuccess: () => refresh([["instance", instance.id], ["dashboard"]]),
  });
  const restore = useMutation({ mutationFn: () => api.post(`/api/instances/${instance.id}/tasks/defaults`, {}), onSuccess: () => refresh([["tasks", "game", instance.id], ["tasks"]]) });
  const card = game.manifest.ownCard;
  if (!card) return null;
  const value = (key: string) => instance.currencies.find((c) => c.key === key)?.value ?? 0;
  return (
    <section className="card ov-card is-full" aria-label={card.title}>
      <Head title={card.title} />
      <div className="ov-own">
        {card.items.map((item) => {
          if ("currency" in item) {
            const def = game.currencies.find((c) => c.key === item.currency);
            if (!def) return null;
            const cap = item.capBy ? capBy(item.capBy, value(item.capBy.currency)) : def.cap;
            return (
              <label key={item.currency} className="ov-own-cell">
                <span className="kpi-label">{def.label}</span>
                <span className="ov-own-value">
                  <input
                    type="number"
                    min={0}
                    aria-label={def.label}
                    key={value(item.currency)}
                    defaultValue={value(item.currency)}
                    onBlur={(e) => e.target.value !== "" && Number(e.target.value) !== value(item.currency) && set.mutate({ key: item.currency, value: Number(e.target.value) })}
                  />
                  {cap !== undefined && (
                    <span className="mu" data-testid={`${item.currency}-cap`}>
                      / {cap}
                    </span>
                  )}
                </span>
              </label>
            );
          }
          const seed = game.defaultTasks.find((t) => t.key === item.task);
          if (!seed) return null;
          const task = tasks.find((t) => t.type === "recurring" && t.title.toLowerCase() === seed.title.toLowerCase());
          return (
            <div key={item.task} className="ov-own-cell">
              <span className="kpi-label">{seed.title}</span>
              {task ? (
                <TickBox instanceId={instance.id} task={task} />
              ) : (
                <button className="btn ghost sm" aria-label={`Add ${seed.title}`} disabled={restore.isPending} onClick={() => restore.mutate()}>
                  +
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
