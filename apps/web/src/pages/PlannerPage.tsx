import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { farmableToday, gameWeekday, getGame, type MaterialStockDto, type TaskOrigin } from "@gacha/shared";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { useToast } from "../lib/toast";
import { GameTabs } from "../components/GameTabs";
import { Segmented } from "../components/ui";
import type { InstanceDetail, TaskItem } from "../lib/types";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NUM = new Intl.NumberFormat("en-GB");
type Range = { from: number; to: number };

/** "Lv 1 → 90 · talents 1/1/1 → 9/9/9" from a plan goal's origin. */
function planned(origin: unknown) {
  const goal = (origin as { goal?: { level?: Range; talents?: Record<string, Range> } } | null)?.goal;
  if (!goal) return "";
  const t = Object.values(goal.talents ?? {});
  return [goal.level && `Lv ${goal.level.from} → ${goal.level.to}`, t.length > 0 && `talents ${t.map((r) => r.from).join("/")} → ${t.map((r) => r.to).join("/")}`].filter(Boolean).join(" · ");
}

/**
 * A game's Planner (WIREFRAMES.md G7): the farming goals with their progress;
 * the materials of the selected goal or of all goals, with where they drop,
 * the days they can be farmed (today outlined), what you have (typed here),
 * what you need and what is missing; what to farm today across goals.
 */
export function PlannerPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const [scope, setScope] = useState<"goal" | "all">("goal");
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  const stock = useQuery({ queryKey: ["stock", id], queryFn: () => api.get<MaterialStockDto[]>(`/api/instances/${id}/materials`) });
  const { index } = useCatalog(instance.data?.gameKey);
  const setQty = useMutation({
    mutationFn: (v: { materialId: string; qty: number }) => api.put(`/api/instances/${id}/materials`, { items: [v] }),
    onSuccess: () => Promise.all([["stock", id], ["needed", id], ["tasks"], ["farm-today"]].map((queryKey) => qc.invalidateQueries({ queryKey }))),
    onError: () => toast("Could not save stock", "err"),
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || tasks.isError) {
    return (
      <div className="card" role="alert">
        <p>The planner could not load.</p>
        <button className="btn" onClick={() => void Promise.all([instance.refetch(), tasks.refetch()])}>Try again</button>
      </div>
    );
  }
  if (!instance.data || !tasks.data || !game) return <div className="mu">Loading…</div>;

  const region = game.regions.find((r) => r.key === instance.data.regionKey) ?? game.regions[0]!;
  const weekday = gameWeekday(region, new Date());
  const mine = tasks.data.filter((t) => t.scope === "game" && t.refId === id);
  const goals = mine.filter((t) => t.type === "goal" && !t.parentId && !t.materialId && (t.origin as TaskOrigin | null)?.catalogId);
  const kidsOf = (g: TaskItem) => mine.filter((t) => t.parentId === g.id && t.materialId);
  // The picked goal, else the first active one that still needs materials.
  const current = goals.find((g) => g.id === picked) ?? goals.find((g) => !g.backlog && kidsOf(g).length > 0) ?? goals[0];
  const have = new Map((stock.data ?? []).map((s) => [s.materialId, s.qty]));

  // This goal's materials, or every goal's summed (backlog left out).
  const needs = new Map<string, number>();
  for (const g of scope === "goal" ? (current ? [current] : []) : goals.filter((x) => !x.backlog)) {
    for (const k of kidsOf(g)) needs.set(k.materialId!, (needs.get(k.materialId!) ?? 0) + (k.target ?? 0));
  }
  const rows = [...needs].map(([materialId, need]) => {
    const m = index?.materials.get(materialId);
    return { materialId, name: m?.name ?? materialId, source: m?.source ?? "", availability: m?.availability ?? [], need, have: have.get(materialId) ?? 0 };
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
        <GameTabs instanceId={instance.data.id} active="planner" gameKey={game.key} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <div className="pn-page">
        <section className="card pn-goals" aria-label="Goals">
          <div className="spread">
            <h3>Goals</h3>
            <Link className="btn" to={`/games/${id}/characters`}>New goal</Link>
          </div>
          {goals.length === 0 && <p className="mu">No farming goal yet: plan one from a character's sheet.</p>}
          {goals.map((g) => {
            const kids = kidsOf(g);
            const got = kids.filter((k) => (have.get(k.materialId!) ?? 0) >= (k.target ?? 0)).length;
            return (
              <button key={g.id} type="button" className={`pn-goal ${g.id === current?.id ? "is-on" : ""}`} aria-pressed={g.id === current?.id} onClick={() => setPicked(g.id)}>
                <span className="spread">
                  <strong>{g.title}</strong>
                  <span className="badge">{g.backlog ? "backlog" : g.priority}</span>
                </span>
                <span className="mn mu">{planned(g.origin)}</span>
                <span className="pn-bar">
                  <span className="tk-meter"><span style={{ width: `${kids.length ? (got / kids.length) * 100 : 0}%` }} /></span>
                  <span className="mn">{got} / {kids.length}</span>
                </span>
              </button>
            );
          })}
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
              <table>
                <thead>
                  <tr><th>Material</th><th>Source</th><th>Days</th><th className="num">Have</th><th className="num">Need</th><th className="num">Missing</th></tr>
                </thead>
                <tbody>
                  {[...open, ...done].map((r) => (
                    <tr key={r.materialId}>
                      <td>{r.name}</td>
                      <td className="mu">{r.source}</td>
                      <td>
                        {r.availability.length ? (
                          <span className="pn-days" role="img" aria-label={`Open ${r.availability.map((d) => WEEKDAY[d]).join(", ")}`}>
                            {DAYS.map((d, i) => <i key={i} className={`${r.availability.includes(i + 1) ? "on" : ""} ${i + 1 === weekday ? "today" : ""}`}>{d}</i>)}
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
            )}
          </section>

          <section className="card pn-today" aria-label={`Farm today · ${WEEKDAY[weekday]}`}>
            <div className="spread">
              <h3>Farm today · {WEEKDAY[weekday]}</h3>
              <span className="mn mu">{scope === "goal" ? "this goal" : "all goals"}</span>
            </div>
            {/* One line per domain and day: today's first, then each one's next open day. */}
            {[...today.map((r) => ({ ...r, when: "Today" })), ...later.map((r) => ({ ...r, when: next(r.availability) }))]
              .reduce<{ when: string; source: string; names: string[] }[]>((lines, r) => {
                const line = lines.find((l) => l.when === r.when && l.source === (r.source || r.name));
                if (line) line.names.push(r.name);
                else lines.push({ when: r.when, source: r.source || r.name, names: [r.name] });
                return lines;
              }, [])
              .map((l) => (
                <div className="pn-line" key={l.when + l.source}>
                  <span className={`badge ${l.when === "Today" ? "done" : ""}`}>{l.when}</span>
                  <span>{l.source}</span>
                  <span className="mu">{l.names.join(", ")}</span>
                </div>
              ))}
            {open.filter((r) => !r.availability.length).length > 0 && (
              <div className="pn-line">
                <span className="badge">Any day</span>
                <span>{open.filter((r) => !r.availability.length).length} materials farmable any day</span>
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
