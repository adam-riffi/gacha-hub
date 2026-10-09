import { useState } from "react";
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

const MD = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Home's top row (VISUAL-DESIGN.md §10): the dailies gauge with the period
 * switch; the goals gauge and the goal-type bars; the backlog line and the
 * pulls gained against spent. Until F8 keeps a daily record, the backlog
 * shows today's point and pull history waits for 08-home-data.
 */
export function HomeTop({ games, tasks, goalMaterials }: { games: DashGame[]; tasks: TaskItem[]; goalMaterials: DashboardData["goalMaterials"] }) {
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

  return (
    <div className="home-top">
      <GraphPanel className="home-top-hero" style={{ width: 496, flex: "0 0 496px", height: 476 }} head={<PeriodSwitch value={period} onChange={setPeriod} />}>
        <HeroGauge done={recDone} total={recurring.length} label={period === "daily" ? "Dailies" : "Weeklies"} />
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
            <LineChart values={[goals.length - goalsDone]} labels={[MD(new Date())]} label="Open goals over time" />
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
            <PairedBars a={[]} b={[]} labels={[]} label="Pulls" names={["gained", "spent"]} />
          </GraphPanel>
        </div>
      </div>
    </div>
  );
}
