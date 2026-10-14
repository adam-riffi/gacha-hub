import type { DashboardData } from "../lib/types";
import { Heatmap, type HeatDay } from "./charts/Heatmap";

type DashGame = DashboardData["games"][number];

/**
 * The dailies heatmap on Home, from each game's day records (VISUAL-DESIGN.md
 * §10), each game by its dailies done that day (round 7: depth). The current
 * game day is live from the dailies themselves, and the map's "today" is the
 * latest game day, so the hours before the reset still count for the day they
 * belong to. Games without dailies stay out. Pinning a day moves Home to it.
 */
export function HomeHeat({ games, today, pinned, onPin }: { games: DashGame[]; today: string; pinned: string | null; onPin: (date: string | null) => void }) {
  const byDate = new Map<string, HeatDay["games"]>();
  const add = (date: string, gameEntry: HeatDay["games"][number]) => byDate.set(date, [...(byDate.get(date) ?? []), gameEntry]);
  for (const game of games) {
    for (const day of game.days) if (day.day !== game.gameDay && day.dailiesTotal > 0) add(day.day, { name: game.name, done: day.dailiesDone, total: day.dailiesTotal });
    const live = game.dailies.filter((daily) => (daily.cadence ?? "daily") === "daily");
    if (game.gameDay && live.length) add(game.gameDay, { name: game.name, done: live.filter((daily) => daily.doneThisCycle).length, total: live.length });
  }
  return (
    <section className="graph home-heat" aria-label="Dailies, last 26 weeks">
      <div className="ph">
        <h3>Dailies, last 26 weeks</h3>
      </div>
      <Heatmap
        days={[...byDate].map(([date, gamesOfDay]) => ({ date, games: gamesOfDay }))}
        today={new Date(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10))}
        pinned={pinned}
        onPin={onPin}
      />
    </section>
  );
}
