import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { GameTabs } from "../components/GameTabs";
import { GameDashboard } from "../components/home/GameDashboard";
import type { InstanceDetail } from "../lib/types";

/**
 * A game's hub opens on its dashboard (round 27, Georges: "navigating is
 * quite hard … each game's dashboard is outside of its category"): the
 * Overview tab, the dashboard that Home showed with the game picked, then
 * Activities and the rest.
 */
export function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: instance } = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="overview" gameKey={instance?.gameKey} />
      </div>
      <GameDashboard instanceId={id!} />
    </>
  );
}
