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
  const queryClient = useQueryClient();
  const toast = useToast();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const teams = useQuery({ queryKey: ["teams", instanceId], queryFn: () => api.get<TeamDto[]>(`/api/instances/${instanceId}/teams`) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["characters", instanceId] });
  const setStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: BuildStatus }) => Promise.all(ids.map((buildId) => api.put(`/api/characters/${buildId}`, { buildStatus: status }))),
    onSuccess: refresh,
    onError: () => toast("Status not saved", "err"),
  });
  const remove = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((buildId) => api.del(`/api/characters/${buildId}`))),
    onSuccess: () => {
      setPicked(new Set());
      void refresh();
    },
    onError: () => toast("Could not delete the builds", "err"),
  });
  const toggle = (buildId: string) =>
    setPicked((previous) => {
      const nextPicked = new Set(previous);
      if (nextPicked.has(buildId)) nextPicked.delete(buildId);
      else nextPicked.add(buildId);
      return nextPicked;
    });
  const rows = [...builds].sort((first, second) => first.name.localeCompare(second.name));

  return (
    <section className="card">
      {picked.size > 0 && (
        <div className="ch-bulk" role="region" aria-label="Selected builds">
          <span className="font-mono">{picked.size} selected</span>
          <select aria-label="Set the status of the selected builds" value="" onChange={(event) => event.target.value && setStatus.mutate({ ids: [...picked], status: event.target.value as BuildStatus })}>
            <option value="">Set status…</option>
            {STATUSES.map((statusOption) => (
              <option key={statusOption.value} value={statusOption.value}>{statusOption.label}</option>
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
              <input type="checkbox" aria-label="Select every build" checked={rows.length > 0 && picked.size === rows.length} onChange={(event) => setPicked(event.target.checked ? new Set(rows.map((row) => row.id)) : new Set())} />
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
          {rows.map((row) => {
            const doc = (row.doc ?? {}) as Record<string, unknown>;
            const entry = entryOf(row.catalogId);
            const inTeams = (teams.data ?? []).filter((team) => row.catalogId && team.members.includes(row.catalogId));
            return (
              <tr key={row.id}>
                <td>
                  <input type="checkbox" aria-label={`Select ${row.name}`} checked={picked.has(row.id)} onChange={() => toggle(row.id)} />
                </td>
                <td>
                  <Link to={`/characters/${row.id}`}>{row.name}</Link>
                  {entry && entry.name !== row.name && <span className="text-muted"> · {entry.name}</span>}
                  <div className="font-mono text-muted">{buildLine(game, doc, entry?.talents.keys ?? [])}</div>
                </td>
                <td>
                  <select aria-label={`${row.name} status`} value={row.buildStatus} onChange={(event) => setStatus.mutate({ ids: [row.id], status: event.target.value as BuildStatus })}>
                    {STATUSES.map((statusOption) => (
                      <option key={statusOption.value} value={statusOption.value}>{statusOption.label}</option>
                    ))}
                  </select>
                </td>
                <td>{buildRole(game, row.role)}</td>
                <td>
                  {buildKpis(game, doc, row.role).map((kpi) => (
                    <span key={kpi.label} className="ch-tkpi">
                      <span className="kpi-label">{kpi.label}</span> <span className="font-mono">{kpi.value}</span>
                    </span>
                  ))}
                </td>
                <td className="text-muted">{gearSetLabel(game, doc) ?? ""}</td>
                <td>{inTeams.length ? inTeams.map((team) => team.name).join(", ") : <span className="text-muted">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-muted">No builds yet: open a character you own and Start a build.</p>}
    </section>
  );
}
