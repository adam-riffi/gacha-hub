import { useState } from "react";
import { savingsPlan, type FarmUnit, type SavingsTarget } from "@gacha/shared";

const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const percentText = (value: number) => `${value >= 0.995 && value < 1 ? ">99" : Math.round(value * 100)}%`;

export type PlannerTarget = SavingsTarget & { sub: string; endsAt?: string; available: number; unit?: FarmUnit };

/**
 * The savings planner (WIREFRAMES.md G3): targets in order, each with what it
 * needs (worst case or on average), whether the pulls left after the ones
 * before cover it, its chance now and with the forecast.
 */
export function SavingsPlanner({ targets, forecast, star = "5★" }: { targets: PlannerTarget[]; forecast: number; star?: string }) {
  const [mode, setMode] = useState<"worst" | "average">("worst");
  // Limited targets share the limited pulls; each one draws from what the ones before left.
  const plan = savingsPlan(targets, targets[0]?.available ?? 0, forecast, mode);
  return (
    <section className="card pl-planner" aria-label="Savings planner">
      <div className="spread">
        <h3>Savings planner</h3>
        <div className="pl-modes" role="radiogroup" aria-label="Plan by">
          <label><input type="radio" name="plan-mode" checked={mode === "worst"} onChange={() => setMode("worst")} /> Worst case</label>
          <label><input type="radio" name="plan-mode" checked={mode === "average"} onChange={() => setMode("average")} /> Average</label>
        </div>
      </div>
      {targets.length === 0 && <p className="mu">No event banner with a featured {star} is running.</p>}
      {plan.map((planItem, index) => {
        const target = targets[index]!;
        return (
          <div className="pl-target" key={target.label + index}>
            <span className="mn mu">{index + 1}</span>
            <div>
              <strong>{target.label}</strong>
              <div className="mn mu">{target.sub}{target.endsAt ? ` · ends ${ENDS.format(new Date(target.endsAt))}` : ""}</div>
            </div>
            <span className="mn pl-needs">needs ≤ {Number.isFinite(planItem.needs) ? planItem.needs : "∞"}</span>
            {planItem.covered ? <span className="badge done">Covered · {percentText(planItem.chance)}</span> : <span className="badge todo">{percentText(planItem.chance)} · short by {Number.isFinite(planItem.short) ? planItem.short : "∞"}</span>}
            {!planItem.covered && <span className="mn mu">{percentText(planItem.withForecast)} with forecast</span>}
          </div>
        );
      })}
    </section>
  );
}
