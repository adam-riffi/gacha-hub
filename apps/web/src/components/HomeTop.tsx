import { useState } from "react";
import { Link } from "react-router-dom";
import { carryForward, dailyGains, dayOf, listedGoal } from "@gacha/shared";
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
function goalType(task: TaskItem): GoalType {
  if (task.type === "checklist") return "gear";
  const kind = (task.origin as { kind?: string } | null)?.kind;
  return kind === "character" ? "character" : kind === "weapon" ? "weapons" : "gameplay";
}

const DAY = 86_400_000;
const monthDay = (date: Date) => `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const isoWeek = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - (utcDate.getUTCDay() || 7));
  return Math.ceil(((utcDate.getTime() - Date.UTC(utcDate.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
};

const ISO = (date: Date) => `${date.getFullYear()}-${monthDay(date)}`;
/** The day `k` days before `d`, in the viewer's calendar (daylight-saving safe). */
const daysBefore = (date: Date, daysBack: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysBack);

/**
 * The pull history's buckets in the viewer's calendar, oldest first: each of
 * the last 7 days, or the last 6 weeks with the last one ending today.
 */
function buckets(period: Period, now = new Date()) {
  const [bucketCount, len] = period === "daily" ? [7, 1] : [6, 7];
  return Array.from({ length: bucketCount }, (_, bucketIndex) => Array.from({ length: len }, (_, dayIndex) => daysBefore(now, (bucketCount - 1 - bucketIndex) * len + (len - 1 - dayIndex))));
}

/** Pulls spent (logged) and gained (pulls on hand going up, from the day records) per bucket ending on `now`, with the period's labels. */
function pullSeries(games: DashGame[], period: Period, now: Date) {
  const periodBuckets = buckets(period, now);
  const dates = periodBuckets.flat().map(ISO);
  const gains = dates.map(() => 0);
  for (const game of games) dailyGains(game.days.map((day) => ({ day: day.day, value: day.pulls })), dates).forEach((date, dateIndex) => (gains[dateIndex]! += date));
  const spentOn = new Map<string, number>();
  for (const logEntry of games.flatMap((game) => game.pullLog)) {
    const day = ISO(new Date(logEntry.at));
    spentOn.set(day, (spentOn.get(day) ?? 0) + logEntry.count);
  }
  let gainIndex = 0;
  const gained = periodBuckets.map((bucket) => bucket.reduce((sum) => sum + gains[gainIndex++]!, 0));
  const spent = periodBuckets.map((bucket) => bucket.reduce((sum, date) => sum + (spentOn.get(ISO(date)) ?? 0), 0));
  const labels = periodBuckets.map((bucket) => (period === "daily" ? monthDay(bucket[0]!) : `W${isoWeek(bucket.at(-1)!)}`));
  return { gained, spent, labels };
}

/**
 * Open goals from the day records, ending on `now`: each of the last 10 days,
 * or the last 8 weeks at their end. The last point is live unless `openNow` is null (a past day).
 */
export function backlogSeries(games: DashGame[], period: Period, openNow: number | null, now: Date) {
  const [pointCount, step] = period === "daily" ? [10, 1] : [8, 7];
  const days = Array.from({ length: pointCount }, (_, pointIndex) => daysBefore(now, (pointCount - 1 - pointIndex) * step));
  const values = days.map(() => 0);
  for (const game of games) carryForward(game.days.map((day) => ({ day: day.day, value: day.goalsOpen })), days.map(ISO)).forEach((value, index) => (values[index]! += value));
  if (openNow !== null) values[pointCount - 1] = openNow;
  return { values, labels: days.map((day) => (period === "daily" ? monthDay(day) : `W${isoWeek(day)}`)) };
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
  const recurring = games.flatMap((game) => game.dailies).filter((daily) => (daily.cadence ?? "daily") === period);
  const recDone = recurring.filter((daily) => daily.doneThisCycle).length;

  // Goals on their own (linked ones too), not backlog. A farming goal is done when its steps are; a checklist when every item is ticked.
  const goals = tasks.filter((task) => listedGoal(task) && !task.backlog && task.type !== "recurring");
  const finished = (task: TaskItem) => {
    const goalMaterial = goalMaterials[task.id];
    if (goalMaterial) return goalMaterial.total > 0 && goalMaterial.done >= goalMaterial.total;
    if (task.type === "checklist") return Boolean(task.items?.length) && task.items!.every((item) => item.done);
    return (task.target ?? 0) > 0 && task.progress >= (task.target ?? 0);
  };
  const byType = GOAL_TYPES.map(({ key, label }) => {
    const mine = goals.filter((goal) => goalType(goal) === key);
    return { label, done: mine.filter(finished).length, total: mine.length };
  });
  const goalsDone = byType.reduce((total, typeTally) => total + typeTally.done, 0);
  const at = day ? new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) : new Date();
  const pulls = pullSeries(games, period, at);
  const backlog = backlogSeries(games, period, day ? null : goals.length - goalsDone, at);
  // Weeklies have no day record: a past day shows its dailies in either period.
  const past = day ? games.map((game) => dayOf(game.days, day)) : null;
  const hero = past
    ? { done: past.reduce((total, pastDay) => total + pastDay.dailiesDone, 0), total: past.reduce((total, pastDay) => total + pastDay.dailiesTotal, 0), label: "Dailies" }
    : { done: recDone, total: recurring.length, label: period === "daily" ? "Dailies" : "Weeklies" };

  return (
    <div className="home-top">
      <GraphPanel className="home-top-hero" head={<PeriodSwitch value={period} onChange={setPeriod} />}>
        <HeroGauge done={hero.done} total={hero.total} label={hero.label} />
      </GraphPanel>
      <div className="home-top-side">
        <div className="home-top-strip">
          <GraphPanel title="Goals" className="home-top-goals" head={<Link to="/tasks?new=1" className="ph-link">+ New goal</Link>}>
            <SmallGauge done={goalsDone} total={goals.length} label="Overall goal completion" />
          </GraphPanel>
          <GraphPanel title="Goal types">
            <PercentBars items={byType} label="Goal completion by type" />
          </GraphPanel>
        </div>
        <div className="home-top-charts">
          <GraphPanel title="Backlog">
            <LineChart values={backlog.values} labels={backlog.labels} label="Open goals over time" />
          </GraphPanel>
          <GraphPanel
            title="Pull history"
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
            <PairedBars firstSeries={pulls.gained} secondSeries={pulls.spent} labels={pulls.labels} label="Pulls" names={["gained", "spent"]} />
          </GraphPanel>
        </div>
      </div>
    </div>
  );
}
