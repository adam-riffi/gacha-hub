import { useState } from "react";
import { savingsPlan, type SavingsTarget } from "@gacha/shared";

const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const pct = (v: number) => `${v >= 0.995 && v < 1 ? ">99" : Math.round(v * 100)}%`;

export type PlannerTarget = SavingsTarget & { sub: string; endsAt?: string; available: number };

/**
 * The savings planner (WIREFRAMES.md G3): targets in order, each with what it
 * needs (worst case or on average), whether the pulls left after the ones
 * before cover it, its chance now and with the forecast.
 */
export function SavingsPlanner({ targets, forecast }: { targets: PlannerTarget[]; forecast: number }) {
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
      {targets.length === 0 && <p className="mu">No event banner with a featured 5★ is running.</p>}
      {plan.map((p, i) => {
        const t = targets[i]!;
        return (
          <div className="pl-target" key={t.label + i}>
            <span className="mn mu">{i + 1}</span>
            <div>
              <strong>{t.label}</strong>
              <div className="mn mu">{t.sub}{t.endsAt ? ` · ends ${ENDS.format(new Date(t.endsAt))}` : ""}</div>
            </div>
            <span className="mn pl-needs">needs ≤ {Number.isFinite(p.needs) ? p.needs : "∞"}</span>
            {p.covered ? <span className="badge done">Covered · {pct(p.chance)}</span> : <span className="badge todo">{pct(p.chance)} · short by {Number.isFinite(p.short) ? p.short : "∞"}</span>}
            {!p.covered && <span className="mn mu">{pct(p.withForecast)} with forecast</span>}
          </div>
        );
      })}
    </section>
  );
}
