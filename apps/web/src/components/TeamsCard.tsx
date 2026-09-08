import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type OwnershipDto, type TeamDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";

/** Saved party presets for a game, built from owned characters. */
export function TeamsCard({ instanceId, gameKey }: { instanceId: string; gameKey: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { index, catalog } = useCatalog(gameKey);
  const teamSize = getGame(gameKey)?.teamSize ?? 4;
  const [name, setName] = useState("");

  const { data: teams } = useQuery({
    queryKey: ["teams", instanceId],
    queryFn: () => api.get<TeamDto[]>(`/api/instances/${instanceId}/teams`),
  });
  const { data: owned } = useQuery({
    queryKey: ["ownership", instanceId],
    queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${instanceId}/ownership`),
    enabled: Boolean(catalog),
  });

  const ownedChars = useMemo(() => {
    if (!index || !owned) return [];
    return owned
      .filter((o) => o.kind === "character")
      .map((o) => index.characters.get(o.catalogId))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [index, owned]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["teams", instanceId] });
  const create = useMutation({
    mutationFn: () => api.post(`/api/instances/${instanceId}/teams`, { name, members: [] }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
    onError: () => toast("Could not create team", "err"),
  });
  const update = useMutation({
    mutationFn: (v: { teamId: string; members: string[] }) =>
      api.put(`/api/instances/${instanceId}/teams/${v.teamId}`, { members: v.members }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (teamId: string) => api.del(`/api/instances/${instanceId}/teams/${teamId}`),
    onSuccess: invalidate,
  });

  if (!catalog) return null;
  const nameOf = (catalogId: string) => index?.characters.get(catalogId)?.name ?? catalogId;

  return (
    <div className="card">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Teams</h3>
        <span className="small muted">party of {teamSize}</span>
      </div>

      <div className="stack" style={{ gap: 10, marginTop: 10 }}>
        {(teams ?? []).length === 0 && <p className="small">No teams yet.</p>}
        {(teams ?? []).map((t) => {
          const available = ownedChars.filter((c) => !t.members.includes(c.id));
          return (
            <div key={t.id} className="goal-card">
              <div className="spread">
                <strong>{t.name}</strong>
                <button className="btn ghost sm" onClick={() => remove.mutate(t.id)}>✕</button>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                {t.members.map((m) => (
                  <span key={m} className="badge">
                    {nameOf(m)}
                    <button
                      className="chip-x"
                      title="Remove"
                      onClick={() => update.mutate({ teamId: t.id, members: t.members.filter((x) => x !== m) })}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {t.members.length < teamSize && available.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => e.target.value && update.mutate({ teamId: t.id, members: [...t.members, e.target.value] })}
                    style={{ width: "auto" }}
                  >
                    <option value="">+ add…</option>
                    {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <input placeholder="New team name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
        <button className="btn sm" disabled={!name || create.isPending} onClick={() => create.mutate()}>+ Team</button>
      </div>
    </div>
  );
}
