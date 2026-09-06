import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import type { GameCatalogItem, InstanceListItem } from "../lib/types";

export function LibraryPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useToast();

  const { data: games, isLoading } = useQuery({
    queryKey: ["games"],
    queryFn: () => api.get<GameCatalogItem[]>("/api/games"),
  });
  const { data: instances } = useQuery({
    queryKey: ["instances"],
    queryFn: () => api.get<InstanceListItem[]>("/api/instances"),
  });

  const install = useMutation({
    mutationFn: (gameKey: string) => api.post<{ id: string }>("/api/instances", { gameKey }),
    onSuccess: (r) => {
      toast("Game installed");
      qc.invalidateQueries();
      nav(`/games/${r.id}`);
    },
    onError: () => toast("Install failed", "err"),
  });

  if (isLoading) return <div className="muted">Loading…</div>;

  const installedByKey = new Map((instances ?? []).map((i) => [i.gameKey, i]));

  return (
    <>
      <div className="page-head">
        <h1>Games</h1>
      </div>
      <p>Each game is hardcoded with its own tracker and character sheet. Install one to start.</p>

      <div className="grid cols-3">
        {games?.map((g) => {
          const installed = installedByKey.get(g.key);
          return (
            <div className="card" key={g.key} style={{ borderTop: `3px solid ${g.accent}` }}>
              <div className="spread" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{g.name}</h3>
              </div>
              <p className="small">
                {g.currencies} currencies · {g.regions.length} region{g.regions.length === 1 ? "" : "s"}
              </p>
              <div className="row" style={{ marginTop: 12 }}>
                {installed ? (
                  <button className="btn sm" onClick={() => nav(`/games/${installed.id}`)}>Open</button>
                ) : (
                  <button
                    className="btn primary sm"
                    onClick={() => install.mutate(g.key)}
                    disabled={install.isPending}
                  >
                    Install
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
