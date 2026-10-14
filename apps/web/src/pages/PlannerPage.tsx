import { Fragment, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PRIORITY_RANK, farmableToday, gameWeekday, getGame, goalSteps, type MaterialStockDto, type TaskOrigin } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { useToast } from "../lib/toast";
import { GameTabs } from "../components/GameTabs";
import { Segmented } from "../components/ui";
import { CatalogIcon, MaterialIcons } from "../components/CatalogIcon";
import { GoalCard } from "../components/tasks/GoalCard";
import { QuickBuild } from "../components/tasks/QuickBuild";
import type { InstanceDetail, InstanceListItem, TaskItem } from "../lib/types";

const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");
/** Two rows of three goals until All (Georges, round 6). */
const SHOWN = 6;
type Sort = "priority" | "progress" | "name";

/**
 * A game's Planner (WIREFRAMES.md G7): the farming goals in rows of three
 * (two rows until All), filtered and sorted, each opening in its own card;
 * below, the materials of the picked goal (its linked goals' too) or of all
 * goals, with where they drop, the days they can be farmed (today outlined),
 * what you have (typed here), what you need and what is missing, beside what
 * to farm today. A goal's materials show only in the table (round 6).
 */
export function PlannerPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const [scope, setScope] = useState<"goal" | "all">("goal");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("priority");
  const [all, setAll] = useState(false);
  const [making, setMaking] = useState(false);
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  const instances = useQuery({ queryKey: ["instances"], queryFn: () => api.get<InstanceListItem[]>("/api/instances") });
  const stock = useQuery({ queryKey: ["stock", id], queryFn: () => api.get<MaterialStockDto[]>(`/api/instances/${id}/materials`) });
  const { index } = useCatalog(instance.data?.gameKey);
  const setQty = useMutation({
    mutationFn: (request: { materialId: string; qty: number }) => api.put(`/api/instances/${id}/materials`, { items: [request] }),
    onSuccess: () => Promise.all([["stock", id], ["needed", id], ["tasks"], ["farm-today"]].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
    onError: () => toast("Could not save stock", "err"),
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || tasks.isError) return <LoadError what="The planner" retry={() => Promise.all([instance.refetch(), tasks.refetch()])} />;
  const gameInstance = instances.data?.find((listed) => listed.id === id);
  if (!instance.data || !tasks.data || !game || !gameInstance) return <div className="mu">Loading…</div>;

  const region = game.regions.find((candidate) => candidate.key === instance.data.regionKey) ?? game.regions[0]!;
  const weekday = gameWeekday(region, new Date());
  const mine = tasks.data.filter((task) => task.scope === "game" && task.refId === id);
  // Linked goals keep their own cards (round 6).
  const goals = mine.filter((task) => task.type === "goal" && !task.materialId && (task.origin as TaskOrigin | null)?.catalogId);
  const kidsOf = (goal: TaskItem) => mine.filter((task) => task.parentId === goal.id && task.materialId);
  const linkedOf = (goal: TaskItem) => goals.filter((candidate) => candidate.parentId === goal.id);
  const share = (goal: TaskItem) => {
    const [done, total] = goalSteps(goal, mine);
    return total ? done / total : 0;
  };
  const needle = query.trim().toLowerCase();
  const listed = goals
    .filter((goal) => !needle || [goal.title, ...kidsOf(goal).map((kid) => kid.title)].some((title) => title.toLowerCase().includes(needle)))
    .sort((first, second) =>
      sort === "name" ? first.title.localeCompare(second.title) : sort === "progress" ? share(second) - share(first) || first.title.localeCompare(second.title) : PRIORITY_RANK[first.priority] - PRIORITY_RANK[second.priority] || first.title.localeCompare(second.title),
    );
  const shown = all ? listed : listed.slice(0, SHOWN);
  // The picked goal, else the first active one that still needs materials.
  const current = goals.find((goal) => goal.id === picked) ?? goals.find((goal) => !goal.backlog && kidsOf(goal).length > 0) ?? goals[0];
  const have = new Map((stock.data ?? []).map((stockItem) => [stockItem.materialId, stockItem.qty]));

  // This goal's materials with its linked goals', or every goal's summed (backlog left out).
  const needs = new Map<string, number>();
  for (const goal of scope === "goal" ? (current ? [current, ...linkedOf(current)] : []) : goals.filter((candidate) => !candidate.backlog)) {
    for (const kid of kidsOf(goal)) needs.set(kid.materialId!, (needs.get(kid.materialId!) ?? 0) + (kid.target ?? 0));
  }
  const rows = [...needs].map(([materialId, need]) => {
    const material = index?.materials.get(materialId);
    return { materialId, name: material?.name ?? materialId, icon: material?.icon, source: material?.source ?? "", availability: material?.availability ?? [], need, have: have.get(materialId) ?? 0 };
  });
  const open = rows.filter((row) => row.have < row.need).sort((first, second) => second.need - second.have - (first.need - first.have));
  const done = rows.filter((row) => row.have >= row.need);
  const today = open.filter((row) => row.availability.length > 0 && farmableToday(row.availability, weekday));
  const later = open.filter((row) => row.availability.length > 0 && !farmableToday(row.availability, weekday));
  const next = (days: number[]) => {
    for (let offset = 1; offset <= 7; offset++) {
      const day = ((weekday - 1 + offset) % 7) + 1;
      if (days.includes(day)) return WEEKDAY[day]!.slice(0, 3);
    }
    return "";
  };

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={instance.data.id} active="planner" gameKey={game.key} />
      </div>
      <div className="pn-page">
        <section className="card pn-goals" aria-label="Goals">
          <div className="pn-goals-head">
            <h3>Goals</h3>
            <input type="search" aria-label="Filter goals" placeholder="Character or material" value={query} onChange={(event) => setQuery(event.target.value)} />
            <Segmented label="Sort" options={[{ value: "priority", label: "Priority" }, { value: "progress", label: "Progress" }, { value: "name", label: "Name" }]} value={sort} onChange={setSort} />
            <span className="ch-sp" />
            <button type="button" className="btn" onClick={() => setMaking(true)}>
              New goal
            </button>
          </div>
          {goals.length === 0 && <p className="mu">No farming goal yet: plan one from a character's sheet.</p>}
          {goals.length > 0 && listed.length === 0 && <p className="mu">No goal matches.</p>}
          {/* The Tasks goal card (Georges, round 4): priority, notify, its plan, Link to; a click also picks it for the materials. */}
          <div className="pn-goal-grid">
            {shown.map((goal) => (
              <div key={goal.id} className={`pn-goal ${goal.id === current?.id ? "is-on" : ""}`} onClickCapture={() => setPicked(goal.id)}>
                <GoalCard goal={goal} tasks={mine} linkable={goals.filter((candidate) => candidate.id !== goal.id && !candidate.parentId && !candidate.backlog)} gameInstance={gameInstance} weekday={weekday} showGame={false} materials={false} />
              </div>
            ))}
          </div>
          {listed.length > SHOWN && (
            <button type="button" className="btn ghost pn-all" onClick={() => setAll(!all)}>
              {all ? "Two rows" : `All ${listed.length} goals`}
            </button>
          )}
        </section>

        {making && <QuickBuild instanceId={id!} gameKey={game.key} catalogIds={[]} onClose={() => setMaking(false)} />}

        <div className="pn-main">
          <section className="card pn-materials" aria-label={`Materials · ${scope === "goal" ? (current?.title ?? "no goal") : "All goals"}`}>
            <div className="spread">
              <h3>Materials · {scope === "goal" ? (current?.title ?? "no goal") : "All goals"}</h3>
              <Segmented label="Materials for" options={[{ value: "goal", label: "This goal" }, { value: "all", label: "All goals" }]} value={scope} onChange={setScope} />
            </div>
            {rows.length === 0 ? (
              <p className="mu">Nothing to farm here.</p>
            ) : (
              <div className="pn-table">
              <table>
                <thead>
                  <tr><th>Material</th><th>Source</th><th>Days</th><th className="num">Have</th><th className="num">Need</th><th className="num">Missing</th></tr>
                </thead>
                <tbody>
                  {[...open, ...done].map((row) => (
                    <tr key={row.materialId}>
                      <td>
                        <span className="pn-mat">
                          <CatalogIcon gameKey={game.key} kind="material" icon={row.icon} name={row.name} />
                          {row.name}
                        </span>
                      </td>
                      <td className="mu">{row.source}</td>
                      <td>
                        {row.availability.length ? (
                          // The open days written out (Georges, 2026-10-11): "Wed Sat"; Sunday opens every domain, so it is left out beside others.
                          <span className="pn-days" data-testid="days">
                            {(row.availability.length > 1 ? row.availability.filter((day) => day !== 7) : row.availability).map((day, dayIndex) => (
                              <Fragment key={day}>
                                {dayIndex > 0 && " "}
                                <span className={day === weekday ? "today" : ""}>{DAY[day]}</span>
                              </Fragment>
                            ))}
                          </span>
                        ) : (
                          <span className="mu">any day</span>
                        )}
                      </td>
                      <td className="num">
                        <input type="number" min={0} aria-label={`${row.name} on hand`} key={row.have} defaultValue={row.have} onBlur={(event) => Number(event.target.value) !== row.have && setQty.mutate({ materialId: row.materialId, qty: Number(event.target.value) })} />
                      </td>
                      <td className="num" data-testid="need">{NUMBER_FORMAT.format(row.need)}</td>
                      <td className="num" data-testid="missing">{row.have >= row.need ? "✓" : NUMBER_FORMAT.format(row.need - row.have)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>

          <section className="card pn-today" aria-label={`Farm today · ${WEEKDAY[weekday]}`}>
            <div className="spread">
              <h3>Farm today · {WEEKDAY[weekday]}</h3>
              <span className="mn mu">{scope === "goal" ? "this goal" : "all goals"}</span>
            </div>
            {/* One line per domain and day: today's first, then each one's next open day. */}
            {[...today.map((row) => ({ ...row, when: "Today" })), ...later.map((row) => ({ ...row, when: next(row.availability) }))]
              .reduce<{ when: string; source: string; ids: string[] }[]>((lines, row) => {
                const line = lines.find((candidate) => candidate.when === row.when && candidate.source === (row.source || row.name));
                if (line) line.ids.push(row.materialId);
                else lines.push({ when: row.when, source: row.source || row.name, ids: [row.materialId] });
                return lines;
              }, [])
              .map((line) => (
                <div className="pn-line" key={line.when + line.source}>
                  <span className={`badge ${line.when === "Today" ? "done" : ""}`}>{line.when}</span>
                  <span>{line.source}</span>
                  <MaterialIcons gameKey={game.key} ids={line.ids} max={6} />
                </div>
              ))}
            {open.filter((row) => !row.availability.length).length > 0 && (
              <div className="pn-line">
                <span className="badge">Any day</span>
                <MaterialIcons gameKey={game.key} ids={open.filter((row) => !row.availability.length).map((row) => row.materialId)} max={10} />
              </div>
            )}
            {open.length === 0 && <p className="mu">Nothing left to farm.</p>}
            <Link className="btn" to={`/tasks?game=${game.key}`}>Open Tasks →</Link>
          </section>
        </div>
      </div>
    </>
  );
}
