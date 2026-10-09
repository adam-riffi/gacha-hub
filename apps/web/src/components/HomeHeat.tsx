import type { DashboardData } from "../lib/types";
import { Heatmap, type HeatDay } from "./charts/Heatmap";

type DashGame = DashboardData["games"][number];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * The dailies heatmap on Home. Until F8 keeps a per-day record (VISUAL-DESIGN.md
 * §13), only today has one: a game is done when every one of its dailies is;
 * games without dailies stay out.
 */
export function HomeHeat({ games }: { games: DashGame[] }) {
  const today: HeatDay = {
    date: iso(new Date()),
    games: games
      .map((g) => ({ name: g.name, dailies: g.dailies.filter((t) => (t.cadence ?? "daily") === "daily") }))
      .filter((g) => g.dailies.length > 0)
      .map((g) => ({ name: g.name, done: g.dailies.every((t) => t.doneThisCycle) })),
  };
  return (
    <section className="graph home-heat">
      <div className="ph">
        <h3>Dailies, last 26 weeks</h3>
      </div>
      <Heatmap days={[today]} />
    </section>
  );
}
