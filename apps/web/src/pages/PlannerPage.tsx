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
import type { InstanceDetail, InstanceListItem, TaskItem } from "../lib/types";

const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NUM = new Intl.NumberFormat("en-GB");
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
  const qc = useQueryClient();
  const toast = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const [scope, setScope] = useState<"goal" | "all">("goal");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("priority");
  const [all, setAll] = useState(false);
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  const instances = useQuery({ queryKey: ["instances"], queryFn: () => api.get<InstanceListItem[]>("/api/instances") });
  const stock = useQuery({ queryKey: ["stock", id], queryFn: () => api.get<MaterialStockDto[]>(`/api/instances/${id}/materials`) });
  const { index } = useCatalog(instance.data?.gameKey);
  const setQty = useMutation({
    mutationFn: (v: { materialId: string; qty: number }) => api.put(`/api/instances/${id}/materials`, { items: [v] }),
    onSuccess: () => Promise.all([["stock", id], ["needed", id], ["tasks"], ["farm-today"]].map((queryKey) => qc.invalidateQueries({ queryKey }))),
    onError: () => toast("Could not save stock", "err"),
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || tasks.isError) return <LoadError what="The planner" retry={() => Promise.all([instance.refetch(), tasks.refetch()])} />;
  const gi = instances.data?.find((i) => i.id === id);
  if (!instance.data || !tasks.data || !game || !gi) return <div className="mu">Loading…</div>;

  const region = game.regions.find((r) => r.key === instance.data.regionKey) ?? game.regions[0]!;
  const weekday = gameWeekday(region, new Date());
  const mine = tasks.data.filter((t) => t.scope === "game" && t.refId === id);
  // Linked goals keep their own cards (round 6).
  const goals = mine.filter((t) => t.type === "goal" && !t.materialId && (t.origin as TaskOrigin | null)?.catalogId);
  const kidsOf = (g: TaskItem) => mine.filter((t) => t.parentId === g.id && t.materialId);
  const linkedOf = (g: TaskItem) => goals.filter((t) => t.parentId === g.id);
  const share = (g: TaskItem) => {
    const [done, total] = goalSteps(g, mine);
    return total ? done / total : 0;
  };
  const needle = q.trim().toLowerCase();
  const listed = goals
    .filter((g) => !needle || [g.title, ...kidsOf(g).map((k) => k.title)].some((s) => s.toLowerCase().includes(needle)))
    .sort((a, b) =>
      sort === "name" ? a.title.localeCompare(b.title) : sort === "progress" ? share(b) - share(a) || a.title.localeCompare(b.title) : PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.title.localeCompare(b.title),
    );
  const shown = all ? listed : listed.slice(0, SHOWN);
  // The picked goal, else the first active one that still needs materials.
  const current = goals.find((g) => g.id === picked) ?? goals.find((g) => !g.backlog && kidsOf(g).length > 0) ?? goals[0];
  const have = new Map((stock.data ?? []).map((s) => [s.materialId, s.qty]));

  // This goal's materials with its linked goals', or every goal's summed (backlog left out).
  const needs = new Map<string, number>();
  for (const g of scope === "goal" ? (current ? [current, ...linkedOf(current)] : []) : goals.filter((x) => !x.backlog)) {
    for (const k of kidsOf(g)) needs.set(k.materialId!, (needs.get(k.materialId!) ?? 0) + (k.target ?? 0));
  }
  const rows = [...needs].map(([materialId, need]) => {
    const m = index?.materials.get(materialId);
    return { materialId, name: m?.name ?? materialId, icon: m?.icon, source: m?.source ?? "", availability: m?.availability ?? [], need, have: have.get(materialId) ?? 0 };
  });
  const open = rows.filter((r) => r.have < r.need).sort((a, b) => b.need - b.have - (a.need - a.have));
  const done = rows.filter((r) => r.have >= r.need);
  const today = open.filter((r) => r.availability.length > 0 && farmableToday(r.availability, weekday));
  const later = open.filter((r) => r.availability.length > 0 && !farmableToday(r.availability, weekday));
  const next = (days: number[]) => {
    for (let k = 1; k <= 7; k++) {
      const d = ((weekday - 1 + k) % 7) + 1;
      if (days.includes(d)) return WEEKDAY[d]!.slice(0, 3);
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
            <input type="search" aria-label="Filter goals" placeholder="Character or material" value={q} onChange={(e) => setQ(e.target.value)} />
            <Segmented label="Sort" options={[{ value: "priority", label: "Priority" }, { value: "progress", label: "Progress" }, { value: "name", label: "Name" }]} value={sort} onChange={setSort} />
            <span className="ch-sp" />
            <Link className="btn" to={`/games/${id}/characters`}>New goal</Link>
          </div>
          {goals.length === 0 && <p className="mu">No farming goal yet: plan one from a character's sheet.</p>}
          {goals.length > 0 && listed.length === 0 && <p className="mu">No goal matches.</p>}
          {/* The Tasks goal card (Georges, round 4): priority, notify, its plan, Link to; a click also picks it for the materials. */}
          <div className="pn-goal-grid">
            {shown.map((g) => (
              <div key={g.id} className={`pn-goal ${g.id === current?.id ? "is-on" : ""}`} onClickCapture={() => setPicked(g.id)}>
                <GoalCard t={g} tasks={mine} linkable={goals.filter((x) => x.id !== g.id && !x.parentId && !x.backlog)} gi={gi} weekday={weekday} showGame={false} materials={false} />
              </div>
            ))}
          </div>
          {listed.length > SHOWN && (
            <button type="button" className="btn ghost pn-all" onClick={() => setAll(!all)}>
              {all ? "Two rows" : `All ${listed.length} goals`}
            </button>
          )}
        </section>

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
                  {[...open, ...done].map((r) => (
                    <tr key={r.materialId}>
                      <td>
                        <span className="pn-mat">
                          <CatalogIcon gameKey={game.key} kind="material" icon={r.icon} name={r.name} />
                          {r.name}
                        </span>
                      </td>
                      <td className="mu">{r.source}</td>
                      <td>
                        {r.availability.length ? (
                          // The open days written out (Georges, 2026-10-11): "Wed Sat"; Sunday opens every domain, so it is left out beside others.
                          <span className="pn-days" data-testid="days">
                            {(r.availability.length > 1 ? r.availability.filter((d) => d !== 7) : r.availability).map((d, i) => (
                              <Fragment key={d}>
                                {i > 0 && " "}
                                <span className={d === weekday ? "today" : ""}>{DAY[d]}</span>
                              </Fragment>
                            ))}
                          </span>
                        ) : (
                          <span className="mu">any day</span>
                        )}
                      </td>
                      <td className="num">
                        <input type="number" min={0} aria-label={`${r.name} on hand`} key={r.have} defaultValue={r.have} onBlur={(e) => Number(e.target.value) !== r.have && setQty.mutate({ materialId: r.materialId, qty: Number(e.target.value) })} />
                      </td>
                      <td className="num" data-testid="need">{NUM.format(r.need)}</td>
                      <td className="num" data-testid="missing">{r.have >= r.need ? "✓" : NUM.format(r.need - r.have)}</td>
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
            {[...today.map((r) => ({ ...r, when: "Today" })), ...later.map((r) => ({ ...r, when: next(r.availability) }))]
              .reduce<{ when: string; source: string; ids: string[] }[]>((lines, r) => {
                const line = lines.find((l) => l.when === r.when && l.source === (r.source || r.name));
                if (line) line.ids.push(r.materialId);
                else lines.push({ when: r.when, source: r.source || r.name, ids: [r.materialId] });
                return lines;
              }, [])
              .map((l) => (
                <div className="pn-line" key={l.when + l.source}>
                  <span className={`badge ${l.when === "Today" ? "done" : ""}`}>{l.when}</span>
                  <span>{l.source}</span>
                  <MaterialIcons gameKey={game.key} ids={l.ids} max={6} />
                </div>
              ))}
            {open.filter((r) => !r.availability.length).length > 0 && (
              <div className="pn-line">
                <span className="badge">Any day</span>
                <MaterialIcons gameKey={game.key} ids={open.filter((r) => !r.availability.length).map((r) => r.materialId)} max={10} />
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
