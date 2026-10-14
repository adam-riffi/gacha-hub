import { Fragment, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currencyKind, endgameNow, getGame, goalSteps, hubResets, listedGoal, passView, pullsFor, skillsField, weaponHolder, type CharacterDto, type CycleResultsDto, type GameDefinition, type PassesDto, type TaskDto } from "@gacha/shared";
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
import { CurrencyIcon } from "../CurrencyIcon";
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
  const dashGame = dash.data?.games.find((candidate) => candidate.instanceId === id);
  if (!instance.data || !game || !dash.data || !dashGame) return <div className="mu">Loading…</div>;
  const banners = dash.data.timeline.banners.filter((banner) => banner.gameKey === game.key);
  const recurring = (tasks.data ?? []).filter((task) => task.type === "recurring");
  const region = game.regions.find((candidate) => candidate.key === instance.data.regionKey) ?? game.regions[0]!;
  const battle = passes.data?.battle;
  const passState = passView(game, region, new Date(), battle ? { ...battle, updatedAt: new Date(battle.updatedAt) } : null, passes.data?.monthly ? { endsAt: new Date(passes.data.monthly.endsAt) } : null);
  // Cards with nothing to show stay out (round 5: no card of empty space).
  const inProgress = (builds.data ?? []).filter((build) => build.buildStatus === "building" || build.buildStatus === "good");
  // A past heatmap day pins the gauges and charts to it, as on the Overview.
  const today = dashGame.gameDay ?? new Date().toISOString().slice(0, 10);
  const pinned = params.get("day");
  const day = pinned && pinned < today ? pinned : null;
  const onPin = (date: string | null) =>
    setParams((current) => {
      if (date && date < today) current.set("day", date);
      else current.delete("day");
      return current;
    });

  return (
    <div className="gd-home">
      <HomeTop games={[dashGame]} tasks={tasks.data ?? []} goalMaterials={dash.data.goalMaterials} day={day} />
      <div className="gd-row">
        <TicksCard dashGame={dashGame} instanceId={id} game={game} region={region} recurring={recurring} />
        <GameBanners dashGame={dashGame} banners={banners} />
      </div>
      <div className="gd-grid">
        {game.pullBanners?.length ? (
          <>
            <PullsCard dashGame={dashGame} game={game} instanceId={id} />
            <PityCard dashGame={dashGame} game={game} instanceId={id} />
          </>
        ) : null}
        <StaminaCard dashGame={dashGame} game={game} instance={instance.data} />
        <PassCard instanceId={id} game={game} passState={passState} />
        <DailyPassCard instanceId={id} game={game} daysLeft={passState.monthlyDaysLeft} endsAt={passes.data?.monthly?.endsAt ?? null} />
        <EndgameCard instanceId={id} game={game} region={region} cycles={cycles.data} />
      </div>
      <HomeHeat games={[dashGame]} today={today} pinned={day} onPin={onPin} />
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
function PullsCard({ dashGame, game, instanceId }: { dashGame: DashGame; game: GameDefinition; instanceId: string }) {
  const rows = dashGame.currencies.filter((currency) => currency.pullCost && !currency.standardOnly && !currency.onlyFor);
  return (
    <Card title="Pulls" to={`/games/${instanceId}/pulls`}>
      <div className="pulls-head">
        <div className="cd pulls-total" data-testid="pulls-total">
          {pullsFor(dashGame.currencies).limited}
        </div>
        <div className="mn pulls-split">
          <span className="mu">limited pulls</span>
        </div>
      </div>
      <div className="lst">
        {rows.map((row) => (
          <div className="rw" key={row.key}>
            <span>
              <CurrencyIcon kind={currencyKind(game, row)} />
              {row.pullCost! > 1 ? `From ${row.label}` : row.label}
            </span>
            <span className="mn">{Math.floor(row.value / row.pullCost!)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Each banner type's pity toward its hard pity, and whether the next top pull is the featured one; a spark's count under its banner. */
function PityCard({ dashGame, game, instanceId }: { dashGame: DashGame; game: GameDefinition; instanceId: string }) {
  return (
    <Card title="Pity" to={`/games/${instanceId}/pulls`} span="wide">
      <div className="lst">
        {dashGame.pity.map((pity) => {
          // The featured unit's share, as the game says it: 50/50, 75/25.
          const rate = game.pullBanners?.find((pullBanner) => pullBanner.key === pity.key)?.featuredRate ?? 1;
          const split = `${Math.round(rate * 100)}/${100 - Math.round(rate * 100)}`;
          return (
            <Fragment key={pity.key}>
              <div className="rw gd-pity">
                <span className="gd-label">{pity.label}</span>
                <Meter value={pity.pity} max={pity.hardPity} />
                <span className="mn gd-fig">
                  {pity.pity}
                  <span className="mu">/{pity.hardPity}</span>
                </span>
                <span className="gd-tag">{rate < 1 && (pity.guaranteed ? <span className="chip hot">guaranteed</span> : <span className="mn mu">{split}</span>)}</span>
              </div>
              {pity.spark && (
                <div className="rw gd-pity">
                  <span className="gd-label">Featured guarantee</span>
                  <Meter value={pity.spark.at} max={pity.spark.of} />
                  <span className="mn gd-fig">
                    {pity.spark.at}
                    <span className="mu">/{pity.spark.of}</span>
                  </span>
                  <span className="gd-tag">{pity.spark.at >= pity.spark.of && <span className="chip hot">ready</span>}</span>
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
function GameBanners({ dashGame, banners }: { dashGame: DashGame; banners: DashboardData["timeline"]["banners"] }) {
  const roster = homeRoster([dashGame], banners);
  const carousel = useCarousel(roster.map((rosterEntry) => rosterEntry.banners.length));
  return <BannersCarousel roster={roster} carousel={carousel} />;
}

/**
 * A row per recurring task, its box ticked in place; then the game's own
 * dailies or weeklies the profile lacks (it was made before they joined),
 * each added with +.
 */
function Ticks({ instanceId, items, game, cadence }: { instanceId: string; items: TaskDto[]; game: GameDefinition; cadence: "daily" | "weekly" }) {
  const queryClient = useQueryClient();
  const restore = useMutation({
    mutationFn: () => api.post(`/api/instances/${instanceId}/tasks/defaults`, {}),
    onSuccess: () => Promise.all([["tasks", "game", instanceId], ["tasks"]].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
  const have = new Set(items.map((item) => item.title.toLowerCase()));
  const missing = game.defaultTasks.filter((defaultTask) => defaultTask.cadence === cadence && !have.has(defaultTask.title.toLowerCase()));
  return (
    <div className="tick-list" style={tickColumn(items)}>
      {items.map((item) => (
        <TickRow key={item.id} instanceId={instanceId} task={item} />
      ))}
      {missing.map((defaultTask) => (
        <div className="tick-row is-missing" key={defaultTask.key}>
          <span className="tick-boxes">
            <button className="btn ghost sm" aria-label={`Add ${defaultTask.title}`} disabled={restore.isPending} onClick={() => restore.mutate()}>
              +
            </button>
          </span>
          <span className="tick-title mu">{defaultTask.title}</span>
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
function TicksCard({ dashGame, instanceId, game, region, recurring }: { dashGame: DashGame; instanceId: string; game: GameDefinition; region: GameDefinition["regions"][number]; recurring: TaskDto[] }) {
  const [weekly] = useState(() => hubResets(game, region, new Date()).weekly.toISOString());
  return (
    <Card title="Dailies & weeklies" to={`/games/${instanceId}`} className="gd-ticks-card">
      <div className="gd-ticks">
        <div>
          <div className="gd-sub">
            <span className="kpi-label">Daily</span>
            {dashGame.nextReset && <Countdown at={dashGame.nextReset} kind="reset" prefix="resets in" />}
          </div>
          <Ticks instanceId={instanceId} items={recurring.filter((task) => task.cadence === "daily")} game={game} cadence="daily" />
        </div>
        <div>
          <div className="gd-sub">
            <span className="kpi-label">Weekly</span>
            <Countdown at={weekly} kind="reset" prefix="resets in" />
          </div>
          <Ticks instanceId={instanceId} items={recurring.filter((task) => task.cadence === "weekly")} game={game} cadence="weekly" />
        </div>
      </div>
    </Card>
  );
}

/** The battle pass as Home's tiles: its level over the segmented bar, this week's EXP; beside the stamina (round 5). */
function PassCard({ instanceId, game, passState }: { instanceId: string; game: GameDefinition; passState: ReturnType<typeof passView> }) {
  const pass = game.manifest.battlePass;
  const compact = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k` : String(value));
  if (!pass && passState.weeklyXpCap === null) return null;
  return (
    <Card title={pass?.name ?? "Weekly EXP"} to={`/games/${instanceId}`}>
      {(pass || passState.weeklyXpCap !== null) && (
        <div className="gd-kpis">
          {pass && (
            <div className="kpi">
              <div className="kpi-label">Level</div>
              <div className="kpi-value">
                {passState.level}
                {passState.maxLevel !== null && <small> / {passState.maxLevel}</small>}
              </div>
              {passState.maxLevel !== null && <SegmentedBar level={passState.level} max={passState.maxLevel} label={pass.name} />}
            </div>
          )}
          {passState.weeklyXpCap !== null && (
            <div className="kpi">
              <div className="kpi-label">Weekly EXP</div>
              <div className="kpi-value">
                {compact(passState.weeklyXp)}
                <small> / {compact(passState.weeklyXpCap)}</small>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");

/**
 * The 30-day pass (Georges, round 7: "a daily login currency bonus like the Blessing of the Welkin Moon: if it's active,
 * how many days, and count it towards pull predictions"): its days left over its stack, what it still pays and in pulls
 * (as the Pulls forecast counts it), its end, and 30 more days in one click.
 */
function DailyPassCard({ instanceId, game, daysLeft, endsAt }: { instanceId: string; game: GameDefinition; daysLeft: number | null; endsAt: string | null }) {
  const queryClient = useQueryClient();
  const pass = game.manifest.monthlyPass;
  const add = useMutation({
    mutationFn: (days: number) => api.put(`/api/instances/${instanceId}/passes/monthly`, { daysLeft: days }),
    onSuccess: () => Promise.all([["passes", instanceId], ["dashboard"]].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
  if (!pass) return null;
  const days = daysLeft ?? 0;
  const stack = pass.maxDays ?? pass.days;
  const premium = game.currencies.find((currency) => (currency.pullCost ?? 0) > 1);
  const still = days * (pass.daily ?? 0);
  return (
    <Card title={pass.name} to={`/games/${instanceId}`} head={<span className={`chip ${days > 0 && days <= 3 ? "hot" : ""}`}>{days > 0 && endsAt ? `ends ${ENDS.format(new Date(endsAt))}` : "off"}</span>}>
      <div className="gd-kpis">
        <div className="kpi" role="group" aria-label="Days left">
          <div className="kpi-label">Days left</div>
          <div className="kpi-value">
            {days}
            <small> / {stack}</small>
          </div>
          <SegmentedBar level={days} max={stack} label={pass.name} />
        </div>
        {pass.daily ? (
          <div className="kpi" role="group" aria-label="Still to collect">
            <div className="kpi-label">Still to collect</div>
            <div className="kpi-value">{NUMBER_FORMAT.format(still)}</div>
            <div className="mn mu">
              {pass.daily} {premium?.label ?? ""} a day{premium?.pullCost ? ` · ${Math.floor(still / premium.pullCost)} pulls` : ""}
            </div>
          </div>
        ) : null}
      </div>
      <button type="button" className="btn gd-pass-add" disabled={add.isPending || days + pass.days > stack} onClick={() => add.mutate(days + pass.days)}>
        Add {pass.days} days
      </button>
    </Card>
  );
}

/** The game's stamina projected to now, Home's big figure over its cap; when it is full, as Home's chip; its reserve. */
function StaminaCard({ dashGame, game, instance }: { dashGame: DashGame; game: GameDefinition; instance: InstanceDetail }) {
  const staminaCurrency = game.currencies.find((currency) => currency.key === game.manifest.stamina.currency);
  const reserveDef = game.currencies.find((currency) => currency.key === game.manifest.stamina.reserve?.currency);
  if (!staminaCurrency || !dashGame.stamina) return null;
  const reserve = reserveDef ? (instance.currencies.find((held) => held.key === reserveDef.key)?.value ?? 0) : null;
  const full = dashGame.stamina.full || !dashGame.stamina.fullAt;
  return (
    <Card
      title={staminaCurrency.label}
      to={`/games/${instance.id}`}
      head={
        <span className={`chip ${full ? "hot" : ""}`}>
          <i aria-hidden="true" />
          {full ? "full" : `full in ${formatRemaining(dashGame.stamina.fullAt!)}`}
        </span>
      }
    >
      <div className="pulls-head">
        <CurrencyIcon kind="stamina" className="is-big" />
        <div className="cd pulls-total" data-testid="stamina">
          {Math.floor(dashGame.stamina.value)}
          <small> / {dashGame.stamina.cap}</small>
        </div>
      </div>
      <div className="gd-bar">
        <Meter value={dashGame.stamina.value} max={dashGame.stamina.cap} />
      </div>
      {reserveDef && (
        <div className="lst">
          <div className="rw">
            <span>
              <CurrencyIcon kind="reserve" />
              {reserveDef.label}
            </span>
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
const numberOrNull = (value: unknown) => (typeof value === "number" ? value : null);

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
              {builds.map((build) => {
                const doc = (build.doc ?? {}) as Doc;
                const unit = build.catalogId ? index?.characters.get(build.catalogId) : undefined;
                const levels = Object.values((doc[skills] ?? {}) as Doc).filter((level): level is number => typeof level === "number");
                const pieces = (doc[gear.field] ?? {}) as Record<string, Doc | undefined>;
                const filled = gear.slots.filter((slot) => pieces[slot.key]?.setName || pieces[slot.key]?.mainStat).length;
                return (
                  <tr key={build.id}>
                    <td>
                      <Link to={`/characters/${build.id}`} className="gd-unit">
                        <CatalogIcon gameKey={game.key} kind="character" icon={unit?.icon} name={unit?.name ?? build.name} tag={unit?.tag} />
                        {unit?.name ?? build.name}
                      </Link>
                    </td>
                    <td className="mn">{numberOrNull(doc.level) ?? "—"}</td>
                    <td className="mn">{levels.length ? levels.join("·") : "—"}</td>
                    <td className="mn">{holder ? (numberOrNull((doc[holder] as Doc | undefined)?.level) ?? "—") : ""}</td>
                    <td>
                      <span className="gd-squares" role="img" aria-label={`${filled} of ${gear.slots.length} ${gear.name}`}>
                        {gear.slots.map((slot) => (
                          <i key={slot.key} className={pieces[slot.key]?.setName || pieces[slot.key]?.mainStat ? "on" : ""} />
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
  const results = (cycles?.results ?? []).map((result) => ({ ...result, cycleStart: new Date(result.cycleStart) }));
  const endgameState = endgameNow(game, region, now, results);
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
          {endgameState.modes.map((mode) => {
            const at = mode.open ? mode.closes : mode.end;
            const days = Math.ceil((at.getTime() - now.getTime()) / DAY);
            return (
              <tr key={mode.mode.key}>
                <td>{mode.mode.name}</td>
                <td className="mn">{mode.result === null ? "—" : `${mode.result}${mode.mode.metric.max !== undefined ? `/${mode.mode.metric.max}` : ""}${unit(mode.mode.metric.label)}`}</td>
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
function progressOf(goal: TaskDto, all: TaskDto[]) {
  const [done, total] = goalSteps(goal, all);
  return total ? done / total : goal.lastCompletedAt ? 1 : 0;
}
const topGoals = (tasks: TaskDto[]) => tasks.filter((task) => listedGoal(task) && task.type !== "recurring");

/** The game's active goals, each with its bar (the Overview's goals gauge sits on top). */
function GoalsCard({ gameKey, tasks, span }: { gameKey: string; tasks: TaskDto[]; span?: "full" }) {
  const goals = topGoals(tasks)
    .filter((task) => !task.backlog)
    .map((task) => ({ task, progress: progressOf(task, tasks) }))
    .sort((first, second) => second.progress - first.progress);
  if (goals.length === 0) return null;
  return (
    <Card title="Goal progress" to={`/tasks?game=${gameKey}`} span={span}>
      <div className="gd-goals">
        <div className="lst gd-scroll">
          <table className="gd-table">
            <tbody>
              {goals.map(({ task: goal, progress }) => (
                <tr key={goal.id}>
                  <td>
                    <Link to={`/tasks?game=${gameKey}`}>{goal.title}</Link>
                  </td>
                  <td className="gd-meter-cell">
                    <Meter value={progress} max={1} />
                  </td>
                  <td className="mn gd-pct">{Math.round(progress * 100)}%</td>
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
const capFromSteps = (capRule: Extract<OwnCardItem, { currency: string }>["capBy"], value: number) => capRule?.steps.reduce((cap, [at, stepCap]) => (value >= at ? stepCap : cap), capRule.steps[0]![1]);

/**
 * The game's own card (its manifest's `ownCard`; Georges's designs: NTE's
 * city, Endfield's AIC and outposts) as Home's KPI tiles: its currencies
 * typed in place, its dailies as boxes; a daily the profile lacks is added
 * from here.
 */
function OwnCard({ game, instance, tasks }: { game: GameDefinition; instance: InstanceDetail; tasks: TaskDto[] }) {
  const queryClient = useQueryClient();
  const refresh = (keys: unknown[][]) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  const set = useMutation({
    mutationFn: (change: { key: string; value: number }) => api.put(`/api/instances/${instance.id}/currencies/${change.key}`, { value: change.value }),
    onSuccess: () => refresh([["instance", instance.id], ["dashboard"]]),
  });
  const restore = useMutation({ mutationFn: () => api.post(`/api/instances/${instance.id}/tasks/defaults`, {}), onSuccess: () => refresh([["tasks", "game", instance.id], ["tasks"]]) });
  const card = game.manifest.ownCard;
  if (!card) return null;
  const value = (key: string) => instance.currencies.find((currency) => currency.key === key)?.value ?? 0;
  return (
    <Card title={card.title} span="full">
      <div className="gd-kpis gd-own">
        {card.items.map((item) => {
          if ("currency" in item) {
            const itemCurrency = game.currencies.find((currency) => currency.key === item.currency);
            if (!itemCurrency) return null;
            const cap = item.capBy ? capFromSteps(item.capBy, value(item.capBy.currency)) : itemCurrency.cap;
            return (
              <label key={item.currency} className="kpi">
                <span className="kpi-label">{itemCurrency.label}</span>
                <span className="gd-own-value mn">
                  <input
                    type="number"
                    min={0}
                    aria-label={itemCurrency.label}
                    key={value(item.currency)}
                    defaultValue={value(item.currency)}
                    onBlur={(event) => event.target.value !== "" && Number(event.target.value) !== value(item.currency) && set.mutate({ key: item.currency, value: Number(event.target.value) })}
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
          const seed = game.defaultTasks.find((defaultTask) => defaultTask.key === item.task);
          if (!seed) return null;
          const task = tasks.find((candidate) => candidate.type === "recurring" && candidate.title.toLowerCase() === seed.title.toLowerCase());
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
