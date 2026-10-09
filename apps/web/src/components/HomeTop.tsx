import { useState } from "react";
import { carryForward, dailyGains, dayOf } from "@gacha/shared";
import type { DashboardData, TaskItem } from "../lib/types";
import { GraphPanel } from "./charts/GraphPanel";
import { HeroGauge, SmallGauge } from "./charts/Gauge";
import { PercentBars } from "./charts/Bars";
import { PeriodSwitch, type Period } from "./charts/PeriodSwitch";
import { LineChart } from "./charts/LineChart";
import { PairedBars } from "./charts/PairedBars";

type DashGame = DashboardData["games"][number];
type GoalType = "character" | "gear" | "weapons" | "gameplay";
const GOAL_TYPES: { key: GoalType; label: string }[] = [
  { key: "character", label: "CHARACTER" },
  { key: "gear", label: "GEAR" },
  { key: "weapons", label: "WEAPONS" },
  { key: "gameplay", label: "GAMEPLAY" },
];

/** Character and weapon plans by their origin, artifact checklists as gear, hand-typed goals as gameplay. */
function goalType(t: TaskItem): GoalType {
  if (t.type === "checklist") return "gear";
  const kind = (t.origin as { kind?: string } | null)?.kind;
  return kind === "character" ? "character" : kind === "weapon" ? "weapons" : "gameplay";
}

const DAY = 86_400_000;
const MD = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
};

const ISO = (d: Date) => `${d.getFullYear()}-${MD(d)}`;
/** The day `k` days before `d`, in the viewer's calendar (daylight-saving safe). */
const daysBefore = (d: Date, k: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - k);

/**
 * The pull history's buckets in the viewer's calendar, oldest first: each of
 * the last 7 days, or the last 6 weeks with the last one ending today.
 */
function buckets(period: Period, now = new Date()) {
  const [n, len] = period === "daily" ? [7, 1] : [6, 7];
  return Array.from({ length: n }, (_, k) => Array.from({ length: len }, (_, j) => daysBefore(now, (n - 1 - k) * len + (len - 1 - j))));
}

/** Pulls spent (logged) and gained (pulls on hand going up, from the day records) per bucket ending on `now`, with the period's labels. */
function pullSeries(games: DashGame[], period: Period, now: Date) {
  const bs = buckets(period, now);
  const dates = bs.flat().map(ISO);
  const gains = dates.map(() => 0);
  for (const g of games) dailyGains(g.days.map((d) => ({ day: d.day, value: d.pulls })), dates).forEach((v, k) => (gains[k]! += v));
  const spentOn = new Map<string, number>();
  for (const e of games.flatMap((g) => g.pullLog)) {
    const day = ISO(new Date(e.at));
    spentOn.set(day, (spentOn.get(day) ?? 0) + e.count);
  }
  let k = 0;
  const gained = bs.map((b) => b.reduce((sum) => sum + gains[k++]!, 0));
  const spent = bs.map((b) => b.reduce((sum, d) => sum + (spentOn.get(ISO(d)) ?? 0), 0));
  const labels = bs.map((b) => (period === "daily" ? MD(b[0]!) : `W${isoWeek(b.at(-1)!)}`));
  return { gained, spent, labels };
}

/**
 * Open goals from the day records, ending on `now`: each of the last 10 days,
 * or the last 8 weeks at their end. The last point is live unless `openNow` is null (a past day).
 */
function backlogSeries(games: DashGame[], period: Period, openNow: number | null, now: Date) {
  const [n, step] = period === "daily" ? [10, 1] : [8, 7];
  const days = Array.from({ length: n }, (_, k) => daysBefore(now, (n - 1 - k) * step));
  const values = days.map(() => 0);
  for (const g of games) carryForward(g.days.map((d) => ({ day: d.day, value: d.goalsOpen })), days.map(ISO)).forEach((v, k) => (values[k]! += v));
  if (openNow !== null) values[n - 1] = openNow;
  return { values, labels: days.map((d) => (period === "daily" ? MD(d) : `W${isoWeek(d)}`)) };
}

/**
 * Home's top row (VISUAL-DESIGN.md §10): the dailies gauge with the period
 * switch; the goals gauge and the goal-type bars; the backlog line and the
 * pulls gained against spent, both from the day records.
 */
export function HomeTop({
  games,
  tasks,
  goalMaterials,
  day = null,
}: {
  games: DashGame[];
  tasks: TaskItem[];
  goalMaterials: DashboardData["goalMaterials"];
  /** A pinned past day (YYYY-MM-DD): the gauge shows its dailies and the charts end on it. */
  day?: string | null;
}) {
  const [period, setPeriod] = useState<Period>("daily");
  const recurring = games.flatMap((g) => g.dailies).filter((t) => (t.cadence ?? "daily") === period);
  const recDone = recurring.filter((t) => t.doneThisCycle).length;

  // Goals: top-level, not backlog. A farming goal is done when its materials are; a checklist when every item is ticked.
  const goals = tasks.filter((t) => !t.parentId && !t.backlog && t.type !== "recurring");
  const finished = (t: TaskItem) => {
    const mat = goalMaterials[t.id];
    if (mat) return mat.total > 0 && mat.done >= mat.total;
    if (t.type === "checklist") return Boolean(t.items?.length) && t.items!.every((i) => i.done);
    return (t.target ?? 0) > 0 && t.progress >= (t.target ?? 0);
  };
  const byType = GOAL_TYPES.map(({ key, label }) => {
    const mine = goals.filter((t) => goalType(t) === key);
    return { label, done: mine.filter(finished).length, total: mine.length };
  });
  const goalsDone = byType.reduce((s, b) => s + b.done, 0);
  const at = day ? new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) : new Date();
  const pulls = pullSeries(games, period, at);
  const backlog = backlogSeries(games, period, day ? null : goals.length - goalsDone, at);
  // Weeklies have no day record: a past day shows its dailies in either period.
  const past = day ? games.map((g) => dayOf(g.days, day)) : null;
  const hero = past
    ? { done: past.reduce((s, t) => s + t.dailiesDone, 0), total: past.reduce((s, t) => s + t.dailiesTotal, 0), label: "Dailies" }
    : { done: recDone, total: recurring.length, label: period === "daily" ? "Dailies" : "Weeklies" };

  return (
    <div className="home-top">
      <GraphPanel className="home-top-hero" style={{ width: 496, flex: "0 0 496px", height: 476 }} head={<PeriodSwitch value={period} onChange={setPeriod} />}>
        <HeroGauge done={hero.done} total={hero.total} label={hero.label} />
      </GraphPanel>
      <div className="home-top-side">
        <div className="home-top-strip">
          <GraphPanel title="Goals" style={{ width: 240, flex: "0 0 240px" }}>
            <SmallGauge done={goalsDone} total={goals.length} label="Overall goal completion" />
          </GraphPanel>
          <GraphPanel title="Goal types" style={{ flex: 1, minWidth: 0 }}>
            <PercentBars items={byType} label="Goal completion by type" />
          </GraphPanel>
        </div>
        <div className="home-top-charts">
          <GraphPanel title="Backlog" style={{ flex: 1, minWidth: 0 }}>
            <LineChart values={backlog.values} labels={backlog.labels} label="Open goals over time" />
          </GraphPanel>
          <GraphPanel
            title="Pull history"
            style={{ flex: 1, minWidth: 0 }}
            head={
              <>
                <span className="sp" />
                <span className="legend">
                  <span><i style={{ background: "var(--accent)" }} />GAINED</span>
                  <span><i style={{ background: "var(--paper)" }} />SPENT</span>
                </span>
              </>
            }
          >
            <PairedBars a={pulls.gained} b={pulls.spent} labels={pulls.labels} label="Pulls" names={["gained", "spent"]} />
          </GraphPanel>
        </div>
      </div>
    </div>
  );
}
