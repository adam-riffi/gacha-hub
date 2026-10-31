import { useMemo } from "react";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LoadError } from "../components/LoadError";
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
import { EndgameNextCard, ExpiringSoonCard, homeGames } from "../components/home/HomeLists";
import type { DashboardData, InstanceListItem, TaskItem } from "../lib/types";

/**
 * Home is the dashboard (VISUAL-DESIGN.md §10): the gauges and charts, the
 * dailies and battle-pass carousels and the heatmap in the main column; the
 * banners carousel, pulls and stamina in the side column. A game's own
 * dashboard (Georges's designs, WIREFRAMES.md G0) is its hub's Overview since
 * round 27; an old link with the game picked lands there.
 */
export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const game = params.get("game");
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<TaskItem[]>("/api/tasks") });
  const { data: instances } = useQuery({ queryKey: ["instances"], queryFn: () => api.get<InstanceListItem[]>("/api/instances") });
  const picked = game ? instances?.find((instance) => instance.gameKey === game) : undefined;

  // Sleeping games stay out of Home entirely (their banners and events too); a scope keeps one game.
  const view = useMemo(() => {
    if (!data) return undefined;
    const shown = new Set(data.games.filter((dashGame) => !dashGame.sleeping && (!game || dashGame.gameKey === game)).map((dashGame) => dashGame.gameKey));
    return {
      ...data,
      games: data.games.filter((dashGame) => shown.has(dashGame.gameKey)),
      timeline: {
        banners: data.timeline.banners.filter((banner) => shown.has(banner.gameKey)),
        events: data.timeline.events.filter((event) => shown.has(event.gameKey)),
      },
    };
  }, [data, game]);

  if (isError) return <LoadError what="Home" retry={refetch} />;
  if (isLoading) return <div className="muted">Loading…</div>;
  if (picked) return <Navigate to={`/games/${picked.id}`} replace />;
  if (!view || view.games.length === 0) {
    return (
      <>
        <h1 className="sr-only">Home</h1>
        <div className="card empty">
          <p>No games yet. Add the games you play to start tracking.</p>
          <Link className="btn primary" to="/settings">Browse games</Link>
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
  const today = view.games.map((game) => game.gameDay ?? "").sort().at(-1) || new Date().toISOString().slice(0, 10);
  const day = pinned && pinned < today ? pinned : null;
  const onPin = (date: string | null) =>
    setParams((current) => {
      if (date && date < today) current.set("day", date);
      else current.delete("day");
      return current;
    });
  const roster = useMemo(() => homeRoster(view.games, view.timeline.banners), [view]);
  const counts = useMemo(() => roster.map((row) => row.banners.length), [roster]);
  const homeGameList = useMemo(() => homeGames(view.games, view.timeline.events), [view]);
  const carousel = useCarousel(counts);
  return (
    <div className="home">
      <div className="home-main">
        <HomeTop games={view.games} tasks={tasks} goalMaterials={view.goalMaterials} day={day} />
        {/* The banners first, beside the dailies (Georges, round 9: "I don't care that much about the battle pass"). */}
        <div className="home-carousels">
          <BannersCarousel roster={roster} carousel={carousel} />
          <DailiesCard roster={roster} carousel={carousel} day={day} />
        </div>
        <HomeHeat games={view.games} today={today} pinned={day} onPin={onPin} />
        <div className="home-lists">
          <EndgameNextCard games={homeGameList} />
          <ExpiringSoonCard games={homeGameList} />
        </div>
      </div>
      <aside className="home-side">
        <PullsCard games={view.games} day={day} />
        <PassCard roster={roster} carousel={carousel} />
        <StaminaCard games={view.games} />
      </aside>
    </div>
  );
}
