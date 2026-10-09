import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { TaskBoard } from "../components/TaskBoard";
import { TodayCard } from "../components/TodayCard";
import type { DashboardData } from "../lib/types";

/** TASKS: today's dailies and the board, for every game or the one in scope (A3 replaces it in F10). */
export function TasksPage() {
  const game = useSearchParams()[0].get("game");
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const games = (data?.games ?? []).filter((g) => !g.sleeping && (!game || g.gameKey === game));
  return (
    <>
      <div className="page-head"><h1>Tasks</h1></div>
      {games.length > 0 && <TodayCard games={games} />}
      <TaskBoard gameKey={game} />
    </>
  );
}
