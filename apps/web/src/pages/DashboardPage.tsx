import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useCarousel } from "../lib/carousel";
import { homeRoster } from "../lib/roster";
import { BannersCarousel } from "../components/BannersCarousel";
import { HomeHeat } from "../components/HomeHeat";
import { HomeTop } from "../components/HomeTop";
import { DailiesCard } from "../components/home/DailiesCard";
import { PassCard } from "../components/home/PassCard";
import { PullsCard } from "../components/home/PullsCard";
import { StaminaCard } from "../components/home/StaminaCard";
import type { DashboardData, TaskItem } from "../lib/types";

/**
 * Home is the dashboard (VISUAL-DESIGN.md §10): the gauges and charts, the
 * dailies and battle-pass carousels and the heatmap in the main column; the
 * banners carousel, pulls and stamina in the side column. A game in scope
 * shows the same page for that game only, in its accent.
 */
export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const game = params.get("game");
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });

  // Sleeping games stay out of Home entirely (their banners and events too); a scope keeps one game.
  const view = useMemo(() => {
    if (!data) return undefined;
    const shown = new Set(data.games.filter((g) => !g.sleeping && (!game || g.gameKey === game)).map((g) => g.gameKey));
    return {
      ...data,
      games: data.games.filter((g) => shown.has(g.gameKey)),
      timeline: {
        banners: data.timeline.banners.filter((b) => shown.has(b.gameKey)),
        events: data.timeline.events.filter((e) => shown.has(e.gameKey)),
      },
    };
  }, [data, game]);

  if (isLoading) return <div className="muted">Loading…</div>;
  if (!view || view.games.length === 0) {
    return (
      <>
        <h1 className="sr-only">Home</h1>
        <div className="card empty">
          <p>No games yet. Add the games you play to start tracking.</p>
          <Link className="btn primary" to="/library">Browse games</Link>
        </div>
      </>
    );
  }
  return (
    <>
      <h1 className="sr-only">Home</h1>
      <Dashboard view={view} tasks={tasks ?? []} pinned={params.get("day")} setParams={setParams} />
    </>
  );
}

/**
 * A pinned heatmap day lives in the URL (`?day=`): a past day moves the
 * dailies, the charts and the pulls to that day (VISUAL-DESIGN.md §10), and
 * pinning today, or BACK TO TODAY, clears it.
 */
function Dashboard({ view, tasks, pinned, setParams }: { view: DashboardData; tasks: TaskItem[]; pinned: string | null; setParams: ReturnType<typeof useSearchParams>[1] }) {
  // The latest game day is "today": the hours before a reset belong to the day before.
  const today = view.games.map((g) => g.gameDay ?? "").sort().at(-1) || new Date().toISOString().slice(0, 10);
  const day = pinned && pinned < today ? pinned : null;
  const onPin = (date: string | null) =>
    setParams((p) => {
      if (date && date < today) p.set("day", date);
      else p.delete("day");
      return p;
    });
  const roster = useMemo(() => homeRoster(view.games, view.timeline.banners), [view]);
  const counts = useMemo(() => roster.map((r) => r.banners.length), [roster]);
  const c = useCarousel(counts);
  return (
    <div className="home">
      <div className="home-main">
        <HomeTop games={view.games} tasks={tasks} goalMaterials={view.goalMaterials} day={day} />
        <div className="home-carousels">
          <DailiesCard roster={roster} c={c} day={day} />
          <PassCard roster={roster} c={c} />
        </div>
        <HomeHeat games={view.games} today={today} pinned={day} onPin={onPin} />
      </div>
      <aside className="home-side">
        <BannersCarousel roster={roster} c={c} />
        <PullsCard games={view.games} day={day} />
        <StaminaCard games={view.games} />
      </aside>
    </div>
  );
}
