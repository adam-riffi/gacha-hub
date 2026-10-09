import type { DashboardData } from "../lib/types";
import { Heatmap, type HeatDay } from "./charts/Heatmap";

type DashGame = DashboardData["games"][number];

/**
 * The dailies heatmap on Home, from each game's day records (VISUAL-DESIGN.md
 * §10): a game is done on a day when every one of its dailies was. The current
 * game day is live from the dailies themselves, and the map's "today" is the
 * latest game day, so the hours before the reset still count for the day they
 * belong to. Games without dailies stay out. Pinning a day moves Home to it.
 */
export function HomeHeat({ games, today, pinned, onPin }: { games: DashGame[]; today: string; pinned: string | null; onPin: (date: string | null) => void }) {
  const byDate = new Map<string, HeatDay["games"]>();
  const add = (date: string, g: HeatDay["games"][number]) => byDate.set(date, [...(byDate.get(date) ?? []), g]);
  for (const g of games) {
    for (const d of g.days) if (d.day !== g.gameDay && d.dailiesTotal > 0) add(d.day, { name: g.name, done: d.dailiesDone >= d.dailiesTotal });
    const live = g.dailies.filter((t) => (t.cadence ?? "daily") === "daily");
    if (g.gameDay && live.length) add(g.gameDay, { name: g.name, done: live.every((t) => t.doneThisCycle) });
  }
  return (
    <section className="graph home-heat">
      <div className="ph">
        <h3>Dailies, last 26 weeks</h3>
      </div>
      <Heatmap
        days={[...byDate].map(([date, g]) => ({ date, games: g }))}
        today={new Date(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10))}
        pinned={pinned}
        onPin={onPin}
      />
    </section>
  );
}
