import { useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type CharacterDto, type OwnershipDto, type TeamDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { communityAssetUrl, assetUrl } from "../lib/assets";
import { elementColor } from "../lib/elements";
import { GameTabs } from "../components/GameTabs";
import { GameIcon } from "../components/GameIcon";
import type { InstanceDetail } from "../lib/types";

/**
 * A game's Teams (Georges, 2026-10-10: "no obvious way to make teams, look at
 * teams, delete teams or manage teams"): every team as a card of its members,
 * each tinted to its element and opening its build or its page; add members
 * from the units you own (then the rest), remove them, rename the team in
 * place, delete it; a new team by name at the top.
 */
export function TeamsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const teams = useQuery({ queryKey: ["teams", id], queryFn: () => api.get<TeamDto[]>(`/api/instances/${id}/teams`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const ownership = useQuery({ queryKey: ["ownership", id], queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${id}/ownership`) });
  const { catalog, index } = useCatalog(instance.data?.gameKey);
  const refresh = () => qc.invalidateQueries({ queryKey: ["teams", id] });
  const create = useMutation({
    mutationFn: () => api.post(`/api/instances/${id}/teams`, { name: name.trim(), members: [] }),
    onSuccess: () => {
      setName("");
      void refresh();
    },
    onError: () => toast("Could not create the team", "err"),
  });
  const update = useMutation({
    mutationFn: (v: { teamId: string; name?: string; members?: string[] }) => api.put(`/api/instances/${id}/teams/${v.teamId}`, { ...(v.name ? { name: v.name } : {}), ...(v.members ? { members: v.members } : {}) }),
    onSuccess: refresh,
    onError: () => toast("Could not save the team", "err"),
  });
  const remove = useMutation({
    mutationFn: (teamId: string) => api.del(`/api/instances/${id}/teams/${teamId}`),
    onSuccess: refresh,
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || teams.isError) return <LoadError what="Teams" retry={() => Promise.all([instance.refetch(), teams.refetch()])} />;
  if (!instance.data || !game || !teams.data) return <div className="mu">Loading…</div>;

  const size = game.teamSize ?? 4;
  const ownedIds = new Set((ownership.data ?? []).filter((o) => o.kind === "character").map((o) => o.catalogId));
  for (const b of builds.data ?? []) if (b.catalogId) ownedIds.add(b.catalogId);
  const units = [...(catalog?.characters ?? [])].sort((a, b) => Number(ownedIds.has(b.id)) - Number(ownedIds.has(a.id)) || a.name.localeCompare(b.name));
  const buildOf = (cid: string) => (builds.data ?? []).find((b) => b.catalogId === cid);

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="teams" gameKey={game.key} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <form
        className="card tm-new"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <h3>Teams</h3>
        <span className="ch-sp" />
        <input aria-label="New team name" placeholder="New team name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary" type="submit" disabled={!name.trim() || create.isPending}>
          Create team
        </button>
      </form>
      {!catalog && <p className="mu">{game.name} has no catalog yet, so its teams take units by hand once it does.</p>}
      <div className="tm-grid">
        {teams.data.map((t) => (
          <section key={t.id} className="card tm-team" aria-label={t.name}>
            <div className="spread">
              <input className="tm-name" aria-label="Team name" defaultValue={t.name} key={t.name} maxLength={80} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== t.name && update.mutate({ teamId: t.id, name: e.target.value.trim() })} />
              <button className="btn ghost" onClick={() => confirm(`Delete the team ${t.name}?`) && remove.mutate(t.id)}>
                Delete team
              </button>
            </div>
            <div className="tm-slots">
              {t.members.map((m) => {
                const unit = index?.characters.get(m);
                const build = buildOf(m);
                const el = elementColor(unit?.tag);
                return (
                  <div key={m} className="tm-slot" style={el ? ({ "--el": el } as CSSProperties) : undefined}>
                    <GameIcon src={assetUrl(game.key, "character", unit?.icon)} fallback={communityAssetUrl(game.key, "character", unit?.icon)} alt={unit?.name ?? m} label={(unit?.name ?? m).slice(0, 2)} />
                    <Link to={build ? `/characters/${build.id}` : `/games/${id}/units/${m}`}>{unit?.name ?? m}</Link>
                    <span className="mn mu">{build ? (build.buildStatus === "none" ? "unbuilt" : build.buildStatus) : ownedIds.has(m) ? "no build" : "not owned"}</span>
                    <button className="btn ghost sm" aria-label={`Remove ${unit?.name ?? m} from ${t.name}`} onClick={() => update.mutate({ teamId: t.id, members: t.members.filter((x) => x !== m) })}>
                      ×
                    </button>
                  </div>
                );
              })}
              {t.members.length < size && catalog && (
                <select className="tm-add" aria-label={`Add a member to ${t.name}`} value="" onChange={(e) => e.target.value && update.mutate({ teamId: t.id, members: [...t.members, e.target.value] })}>
                  <option value="">+ Add a member…</option>
                  {units
                    .filter((u) => !t.members.includes(u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                        {ownedIds.has(u.id) ? "" : " (not owned)"}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </section>
        ))}
      </div>
      {teams.data.length === 0 && <p className="mu">No teams yet: name one above, then add its members.</p>}
    </>
  );
}
