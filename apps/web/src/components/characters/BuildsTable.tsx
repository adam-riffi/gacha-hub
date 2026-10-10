import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildKpis, buildLine, buildRole, gearSetLabel, type BuildStatus, type CatalogCharacter, type CharacterDto, type GameDefinition, type TeamDto } from "@gacha/shared";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";

export const STATUSES: { value: BuildStatus; label: string }[] = [
  { value: "none", label: "Unbuilt" },
  { value: "building", label: "Building" },
  { value: "good", label: "Good" },
  { value: "perfect", label: "Perfect" },
];

/**
 * Every build of a game in one table (Georges, 2026-10-10: "where can I see
 * my builds"): the build and its unit, its status changed in place, role and
 * KPIs, gear set and the teams it is in. Select several to set their status
 * or delete them at once.
 */
export function BuildsTable({
  instanceId,
  game,
  builds,
  entryOf,
}: {
  instanceId: string;
  game: GameDefinition;
  builds: CharacterDto[];
  entryOf: (catalogId: string | null) => CatalogCharacter | undefined;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const teams = useQuery({ queryKey: ["teams", instanceId], queryFn: () => api.get<TeamDto[]>(`/api/instances/${instanceId}/teams`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["characters", instanceId] });
  const setStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: BuildStatus }) => Promise.all(ids.map((b) => api.put(`/api/characters/${b}`, { buildStatus: status }))),
    onSuccess: refresh,
    onError: () => toast("Status not saved", "err"),
  });
  const remove = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((b) => api.del(`/api/characters/${b}`))),
    onSuccess: () => {
      setPicked(new Set());
      void refresh();
    },
    onError: () => toast("Could not delete the builds", "err"),
  });
  const toggle = (b: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(b)) n.delete(b);
      else n.add(b);
      return n;
    });
  const rows = [...builds].sort((a, z) => a.name.localeCompare(z.name));

  return (
    <section className="card">
      {picked.size > 0 && (
        <div className="ch-bulk" role="region" aria-label="Selected builds">
          <span className="mn">{picked.size} selected</span>
          <select aria-label="Set the status of the selected builds" value="" onChange={(e) => e.target.value && setStatus.mutate({ ids: [...picked], status: e.target.value as BuildStatus })}>
            <option value="">Set status…</option>
            {STATUSES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className="btn" disabled={remove.isPending} onClick={() => confirm(`Delete ${picked.size} build${picked.size === 1 ? "" : "s"}?`) && remove.mutate([...picked])}>
            Delete
          </button>
          <button className="btn ghost" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}
      <table aria-label="Builds" className="ch-table">
        <thead>
          <tr>
            <th>
              <input type="checkbox" aria-label="Select every build" checked={rows.length > 0 && picked.size === rows.length} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
            </th>
            <th>Build</th>
            <th>Status</th>
            <th>Role</th>
            <th>KPIs</th>
            <th>Set</th>
            <th>Teams</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const doc = (b.doc ?? {}) as Record<string, unknown>;
            const entry = entryOf(b.catalogId);
            const inTeams = (teams.data ?? []).filter((t) => b.catalogId && t.members.includes(b.catalogId));
            return (
              <tr key={b.id}>
                <td>
                  <input type="checkbox" aria-label={`Select ${b.name}`} checked={picked.has(b.id)} onChange={() => toggle(b.id)} />
                </td>
                <td>
                  <Link to={`/characters/${b.id}`}>{b.name}</Link>
                  {entry && entry.name !== b.name && <span className="mu"> · {entry.name}</span>}
                  <div className="mn mu">{buildLine(game, doc, entry?.talents.keys ?? [])}</div>
                </td>
                <td>
                  <select aria-label={`${b.name} status`} value={b.buildStatus} onChange={(e) => setStatus.mutate({ ids: [b.id], status: e.target.value as BuildStatus })}>
                    {STATUSES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td>{buildRole(game, b.role)}</td>
                <td>
                  {buildKpis(game, doc, b.role).map((k) => (
                    <span key={k.label} className="ch-tkpi">
                      <span className="kpi-label">{k.label}</span> <span className="mn">{k.value}</span>
                    </span>
                  ))}
                </td>
                <td className="mu">{gearSetLabel(game, doc) ?? ""}</td>
                <td>{inTeams.length ? inTeams.map((t) => t.name).join(", ") : <span className="mu">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mu">No builds yet: open a character you own and Start a build.</p>}
    </section>
  );
}
