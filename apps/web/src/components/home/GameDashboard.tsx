import { Fragment, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endgameNow, getGame, goalSteps, hubResets, listedGoal, passView, pullsFor, skillsField, weaponHolder, type CharacterDto, type CycleResultsDto, type GameDefinition, type PassesDto, type TaskDto } from "@gacha/shared";
import { LoadError } from "../LoadError";
import { api } from "../../lib/api";
import { formatRemaining } from "../../lib/time";
import { useCarousel } from "../../lib/carousel";
import { homeRoster } from "../../lib/roster";
import { useCatalog } from "../../lib/catalog";
import { BannersCarousel } from "../BannersCarousel";
import { CatalogIcon } from "../CatalogIcon";
import { Countdown } from "../ui";
import { HomeTop } from "../HomeTop";
import { HomeHeat } from "../HomeHeat";
import { SegmentedBar } from "../charts/SegmentedBar";
import { TickBox, TickRow, tickColumn } from "../TickControl";
import type { DashboardData, InstanceDetail } from "../../lib/types";

type DashGame = DashboardData["games"][number];

/**
 * A game's dashboard (WIREFRAMES.md G0): Home with that game picked, a hybrid
 * of the all-games Overview and Georges's designs, in the Overview's language
 * (round 5): the Overview's gauges and charts on top, for this game; its
 * dailies and weeklies ticked in place beside its banners (where the Overview
 * has the battle pass); pulls and pity; stamina beside the battle pass and
 * the endgame cycle; the dailies' heatmap; builds, goals, the game's own
 * card. Each card's title opens its screen; a heatmap day pins as on the
 * Overview (`?day=`).
 */
export function GameDashboard({ instanceId: id }: { instanceId: string }) {
  const [params, setParams] = useSearchParams();
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const tasks = useQuery({ queryKey: ["tasks", "game", id], queryFn: () => api.get<TaskDto[]>(`/api/tasks?scope=game&refId=${id}`) });
  const passes = useQuery({ queryKey: ["passes", id], queryFn: () => api.get<PassesDto>(`/api/instances/${id}/passes`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const cycles = useQuery({ queryKey: ["cycles", id], queryFn: () => api.get<CycleResultsDto>(`/api/instances/${id}/cycles`) });
  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || dash.isError) return <LoadError what="The dashboard" retry={() => Promise.all([instance.refetch(), dash.refetch()])} />;
  const g = dash.data?.games.find((x) => x.instanceId === id);
  if (!instance.data || !game || !dash.data || !g) return <div className="mu">Loading…</div>;
  const banners = dash.data.timeline.banners.filter((b) => b.gameKey === game.key);
  const recurring = (tasks.data ?? []).filter((t) => t.type === "recurring");
  const region = game.regions.find((r) => r.key === instance.data.regionKey) ?? game.regions[0]!;
  const battle = passes.data?.battle;
  const pv = passView(game, region, new Date(), battle ? { ...battle, updatedAt: new Date(battle.updatedAt) } : null, null);
  // Cards with nothing to show stay out (round 5: no card of empty space).
  const inProgress = (builds.data ?? []).filter((b) => b.buildStatus === "building" || b.buildStatus === "good");
  // A past heatmap day pins the gauges and charts to it, as on the Overview.
  const today = g.gameDay ?? new Date().toISOString().slice(0, 10);
  const pinned = params.get("day");
  const day = pinned && pinned < today ? pinned : null;
  const onPin = (date: string | null) =>
    setParams((p) => {
      if (date && date < today) p.set("day", date);
      else p.delete("day");
      return p;
    });

  return (
    <div className="gd-home">
      <HomeTop games={[g]} tasks={tasks.data ?? []} goalMaterials={dash.data.goalMaterials} day={day} />
      <div className="gd-row">
        <TicksCard g={g} instanceId={id} game={game} region={region} recurring={recurring} />
        <GameBanners g={g} banners={banners} />
      </div>
      <div className="gd-grid">
        {game.pullBanners?.length ? (
          <>
            <PullsCard g={g} instanceId={id} />
            <PityCard g={g} game={game} instanceId={id} />
          </>
        ) : null}
        <StaminaCard g={g} game={game} instance={instance.data} />
        <PassCard instanceId={id} game={game} pv={pv} />
        <EndgameCard instanceId={id} game={game} region={region} cycles={cycles.data} />
      </div>
      <HomeHeat games={[g]} today={today} pinned={day} onPin={onPin} />
      <div className="gd-grid">
        {inProgress.length > 0 && <BuildsCard instanceId={id} game={game} builds={inProgress} />}
        <GoalsCard gameKey={game.key} tasks={tasks.data ?? []} span={inProgress.length ? undefined : "full"} />
        <OwnCard game={game} instance={instance.data} tasks={tasks.data ?? []} />
      </div>
    </div>
  );
}

/** A card in Home's chrome: its title (opening its screen), what sits beside it, then its content. */
function Card({ title, to, label = title, span, head, className = "", children }: { title: string; to?: string; label?: string; span?: "wide" | "full"; head?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`card table-card gd-card ${span ? `is-${span}` : ""} ${className}`} aria-label={label}>
      <div className="ph">
        <h3>{to ? <Link to={to}>{title}</Link> : title}</h3>
        {head && <span className="gd-head">{head}</span>}
      </div>
      {children}
    </section>
  );
}

/** A value over its cap as a thin bar. */
const Meter = ({ value, max }: { value: number; max: number }) => (
  <span className="gd-meter" aria-hidden="true">
    <i style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
  </span>
);

/** Limited pulls on hand, Home's big figure; then what makes them (each ticket, and the premium currency in pulls). */
function PullsCard({ g, instanceId }: { g: DashGame; instanceId: string }) {
  const rows = g.currencies.filter((c) => c.pullCost && !c.standardOnly && !c.onlyFor);
  return (
    <Card title="Pulls" to={`/games/${instanceId}/pulls`}>
      <div className="pulls-head">
        <div className="cd pulls-total" data-testid="pulls-total">
          {pullsFor(g.currencies).limited}
        </div>
        <div className="mn pulls-split">
          <span className="mu">limited pulls</span>
        </div>
      </div>
      <div className="lst">
        {rows.map((c) => (
          <div className="rw" key={c.key}>
            <span>{c.pullCost! > 1 ? `From ${c.label}` : c.label}</span>
            <span className="mn">{Math.floor(c.value / c.pullCost!)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Each banner type's pity toward its hard pity, and whether the next top pull is the featured one; a spark's count under its banner. */
function PityCard({ g, game, instanceId }: { g: DashGame; game: GameDefinition; instanceId: string }) {
  return (
    <Card title="Pity" to={`/games/${instanceId}/pulls`} span="wide">
      <div className="lst">
        {g.pity.map((p) => {
          // The featured unit's share, as the game says it: 50/50, 75/25.
          const rate = game.pullBanners?.find((b) => b.key === p.key)?.featuredRate ?? 1;
          const split = `${Math.round(rate * 100)}/${100 - Math.round(rate * 100)}`;
          return (
            <Fragment key={p.key}>
              <div className="rw gd-pity">
                <span className="gd-label">{p.label}</span>
                <Meter value={p.pity} max={p.hardPity} />
                <span className="mn gd-fig">
                  {p.pity}
                  <span className="mu">/{p.hardPity}</span>
                </span>
                <span className="gd-tag">{rate < 1 && (p.guaranteed ? <span className="chip hot">guaranteed</span> : <span className="mn mu">{split}</span>)}</span>
              </div>
              {p.spark && (
                <div className="rw gd-pity">
                  <span className="gd-label">Featured guarantee</span>
                  <Meter value={p.spark.at} max={p.spark.of} />
                  <span className="mn gd-fig">
                    {p.spark.at}
                    <span className="mu">/{p.spark.of}</span>
                  </span>
                  <span className="gd-tag">{p.spark.at >= p.spark.of && <span className="chip hot">ready</span>}</span>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </Card>
  );
}

/** The game's running banners in Home's carousel: art, its deadline, the arrows. */
function GameBanners({ g, banners }: { g: DashGame; banners: DashboardData["timeline"]["banners"] }) {
  const roster = homeRoster([g], banners);
  const c = useCarousel(roster.map((r) => r.banners.length));
  return <BannersCarousel roster={roster} c={c} />;
}

/**
 * A row per recurring task, its box ticked in place; then the game's own
 * dailies or weeklies the profile lacks (it was made before they joined),
 * each added with +.
 */
function Ticks({ instanceId, items, game, cadence }: { instanceId: string; items: TaskDto[]; game: GameDefinition; cadence: "daily" | "weekly" }) {
  const qc = useQueryClient();
  const restore = useMutation({
    mutationFn: () => api.post(`/api/instances/${instanceId}/tasks/defaults`, {}),
    onSuccess: () => Promise.all([["tasks", "game", instanceId], ["tasks"]].map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
  const have = new Set(items.map((t) => t.title.toLowerCase()));
  const missing = game.defaultTasks.filter((t) => t.cadence === cadence && !have.has(t.title.toLowerCase()));
  return (
    <div className="tick-list" style={tickColumn(items)}>
      {items.map((t) => (
        <TickRow key={t.id} instanceId={instanceId} task={t} />
      ))}
      {missing.map((t) => (
        <div className="tick-row is-missing" key={t.key}>
          <span className="tick-boxes">
            <button className="btn ghost sm" aria-label={`Add ${t.title}`} disabled={restore.isPending} onClick={() => restore.mutate()}>
              +
            </button>
          </span>
          <span className="tick-title mu">{t.title}</span>
        </div>
      ))}
      {items.length === 0 && missing.length === 0 && <p className="table-empty">None</p>}
    </div>
  );
}

/**
 * The dailies and weeklies, ticked in place, each column with its reset: the
 * Overview's Dailies & weeklies for this game, the gauge being on top.
 */
function TicksCard({ g, instanceId, game, region, recurring }: { g: DashGame; instanceId: string; game: GameDefinition; region: GameDefinition["regions"][number]; recurring: TaskDto[] }) {
  const [weekly] = useState(() => hubResets(game, region, new Date()).weekly.toISOString());
  return (
    <Card title="Dailies & weeklies" to={`/games/${instanceId}`} className="gd-ticks-card">
      <div className="gd-ticks">
        <div>
          <div className="gd-sub">
            <span className="kpi-label">Daily</span>
            {g.nextReset && <Countdown at={g.nextReset} kind="reset" prefix="resets in" />}
          </div>
          <Ticks instanceId={instanceId} items={recurring.filter((t) => t.cadence === "daily")} game={game} cadence="daily" />
        </div>
        <div>
          <div className="gd-sub">
            <span className="kpi-label">Weekly</span>
            <Countdown at={weekly} kind="reset" prefix="resets in" />
          </div>
          <Ticks instanceId={instanceId} items={recurring.filter((t) => t.cadence === "weekly")} game={game} cadence="weekly" />
        </div>
      </div>
    </Card>
  );
}

/** The battle pass as Home's tiles: its level over the segmented bar, this week's EXP; beside the stamina (round 5). */
function PassCard({ instanceId, game, pv }: { instanceId: string; game: GameDefinition; pv: ReturnType<typeof passView> }) {
  const pass = game.manifest.battlePass;
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k` : String(n));
  if (!pass && pv.weeklyXpCap === null) return null;
  return (
    <Card title={pass?.name ?? "Weekly EXP"} to={`/games/${instanceId}`}>
      {(pass || pv.weeklyXpCap !== null) && (
        <div className="gd-kpis">
          {pass && (
            <div className="kpi">
              <div className="kpi-label">Level</div>
              <div className="kpi-value">
                {pv.level}
                {pv.maxLevel !== null && <small> / {pv.maxLevel}</small>}
              </div>
              {pv.maxLevel !== null && <SegmentedBar level={pv.level} max={pv.maxLevel} label={pass.name} />}
            </div>
          )}
          {pv.weeklyXpCap !== null && (
            <div className="kpi">
              <div className="kpi-label">Weekly EXP</div>
              <div className="kpi-value">
                {k(pv.weeklyXp)}
                <small> / {k(pv.weeklyXpCap)}</small>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** The game's stamina projected to now, Home's big figure over its cap; when it is full, as Home's chip; its reserve. */
function StaminaCard({ g, game, instance }: { g: DashGame; game: GameDefinition; instance: InstanceDetail }) {
  const def = game.currencies.find((c) => c.key === game.manifest.stamina.currency);
  const reserveDef = game.currencies.find((c) => c.key === game.manifest.stamina.reserve?.currency);
  if (!def || !g.stamina) return null;
  const reserve = reserveDef ? (instance.currencies.find((c) => c.key === reserveDef.key)?.value ?? 0) : null;
  const full = g.stamina.full || !g.stamina.fullAt;
  return (
    <Card
      title={def.label}
      to={`/games/${instance.id}`}
      head={
        <span className={`chip ${full ? "hot" : ""}`}>
          <i aria-hidden="true" />
          {full ? "full" : `full in ${formatRemaining(g.stamina.fullAt!)}`}
        </span>
      }
    >
      <div className="pulls-head">
        <div className="cd pulls-total" data-testid="stamina">
          {Math.floor(g.stamina.value)}
          <small> / {g.stamina.cap}</small>
        </div>
      </div>
      <div className="gd-bar">
        <Meter value={g.stamina.value} max={g.stamina.cap} />
      </div>
      {reserveDef && (
        <div className="lst">
          <div className="rw">
            <span>{reserveDef.label}</span>
            <span className="mn">
              {reserve}
              {reserveDef.cap && <span className="mu"> / {reserveDef.cap}</span>}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

const DAY = 86_400_000;
type Doc = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" ? v : null);

/** Builds being worked on, in Home's table: level, skills, weapon level, and a square per gear slot filled. */
function BuildsCard({ instanceId, game, builds }: { instanceId: string; game: GameDefinition; builds: CharacterDto[] }) {
  const { index } = useCatalog(game.key);
  const skills = skillsField(game);
  const holder = weaponHolder(game);
  const gear = game.manifest.gear;
  return (
    <Card title="Builds in progress" to={`/games/${instanceId}/characters`} span="wide">
      {builds.length === 0 ? (
        <p className="table-empty">None</p>
      ) : (
        <div className="lst gd-scroll">
          <table className="gd-table">
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
                const filled = gear.slots.filter((s) => pieces[s.key]?.setName || pieces[s.key]?.mainStat).length;
                return (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/characters/${b.id}`} className="gd-unit">
                        <CatalogIcon gameKey={game.key} kind="character" icon={unit?.icon} name={unit?.name ?? b.name} tag={unit?.tag} />
                        {unit?.name ?? b.name}
                      </Link>
                    </td>
                    <td className="mn">{num(doc.level) ?? "—"}</td>
                    <td className="mn">{levels.length ? levels.join("·") : "—"}</td>
                    <td className="mn">{holder ? (num((doc[holder] as Doc | undefined)?.level) ?? "—") : ""}</td>
                    <td>
                      <span className="gd-squares" role="img" aria-label={`${filled} of ${gear.slots.length} ${gear.name}`}>
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
    </Card>
  );
}

/** Each endgame mode's current cycle: its result over its best, and when it resets as Home's chip (white within a day). */
function EndgameCard({ instanceId, game, region, cycles }: { instanceId: string; game: GameDefinition; region: GameDefinition["regions"][number]; cycles?: CycleResultsDto }) {
  const [now] = useState(() => new Date());
  if (game.manifest.endgame.length === 0) return null;
  const results = (cycles?.results ?? []).map((r) => ({ ...r, cycleStart: new Date(r.cycleStart) }));
  const eg = endgameNow(game, region, now, results);
  const unit = (label: string) => (label === "stars" ? "★" : ` ${label}`);
  return (
    <Card title="Endgame · cycle" to={`/games/${instanceId}/endgame`}>
      <table className="gd-table">
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
                <td>
                  <span className={`chip ${days <= 1 ? "hot" : ""}`}>
                    <i aria-hidden="true" />
                    {days > 1 ? `${days}d` : formatRemaining(at.toISOString(), now.getTime())}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/** A goal's progress, 0 to 1: its steps (its linked goals' added), else done or not. */
function progressOf(t: TaskDto, all: TaskDto[]) {
  const [done, total] = goalSteps(t, all);
  return total ? done / total : t.lastCompletedAt ? 1 : 0;
}
const topGoals = (tasks: TaskDto[]) => tasks.filter((t) => listedGoal(t) && t.type !== "recurring");

/** The game's active goals, each with its bar (the Overview's goals gauge sits on top). */
function GoalsCard({ gameKey, tasks, span }: { gameKey: string; tasks: TaskDto[]; span?: "full" }) {
  const goals = topGoals(tasks)
    .filter((t) => !t.backlog)
    .map((t) => ({ t, p: progressOf(t, tasks) }))
    .sort((a, b) => b.p - a.p);
  if (goals.length === 0) return null;
  return (
    <Card title="Goal progress" to={`/tasks?game=${gameKey}`} span={span}>
      <div className="gd-goals">
        <div className="lst gd-scroll">
          <table className="gd-table">
            <tbody>
              {goals.map(({ t, p }) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/tasks?game=${gameKey}`}>{t.title}</Link>
                  </td>
                  <td className="gd-meter-cell">
                    <Meter value={p} max={1} />
                  </td>
                  <td className="mn gd-pct">{Math.round(p * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

type OwnCardItem = NonNullable<GameDefinition["manifest"]["ownCard"]>["items"][number];
/** A cap that follows another value by steps: the last step reached. */
const capBy = (by: Extract<OwnCardItem, { currency: string }>["capBy"], v: number) => by?.steps.reduce((cap, [at, c]) => (v >= at ? c : cap), by.steps[0]![1]);

/**
 * The game's own card (its manifest's `ownCard`; Georges's designs: NTE's
 * city, Endfield's AIC and outposts) as Home's KPI tiles: its currencies
 * typed in place, its dailies as boxes; a daily the profile lacks is added
 * from here.
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
    <Card title={card.title} span="full">
      <div className="gd-kpis gd-own">
        {card.items.map((item) => {
          if ("currency" in item) {
            const def = game.currencies.find((c) => c.key === item.currency);
            if (!def) return null;
            const cap = item.capBy ? capBy(item.capBy, value(item.capBy.currency)) : def.cap;
            return (
              <label key={item.currency} className="kpi">
                <span className="kpi-label">{def.label}</span>
                <span className="gd-own-value mn">
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
            <div key={item.task} className="kpi">
              <span className="kpi-label">{seed.title}</span>
              <span className="gd-own-value">
                {task ? (
                  <TickBox instanceId={instance.id} task={task} />
                ) : (
                  <button className="btn ghost sm" aria-label={`Add ${seed.title}`} disabled={restore.isPending} onClick={() => restore.mutate()}>
                    +
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
