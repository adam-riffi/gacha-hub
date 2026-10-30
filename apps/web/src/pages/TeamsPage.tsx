import { useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CharacterBuild, elementColor, getGame, weaponHolder, type CharacterDto, type OwnershipDto, type TeamDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { communityAssetUrl, assetUrl } from "../lib/assets";

import { GameTabs } from "../components/GameTabs";
import { GameIcon } from "../components/GameIcon";
import { CatalogIcon } from "../components/CatalogIcon";
import { Picker } from "../components/Picker";
import type { InstanceDetail } from "../lib/types";

/**
 * A game's Teams (Georges, 2026-10-10: "no obvious way to make teams, look at
 * teams, delete teams or manage teams"): every team as a card of its members,
 * each its face (round 26: "bigger character icons, i only need to see the
 * characters, and their weapons and their sets, nothing more") tinted to its
 * element and opening its build or its page, its weapon and its completed sets
 * under it; add members from the units you own (then the rest), remove them,
 * rename the team in place, delete it; a new team by name at the top.
 */
export function TeamsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const teams = useQuery({ queryKey: ["teams", id], queryFn: () => api.get<TeamDto[]>(`/api/instances/${id}/teams`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const ownership = useQuery({ queryKey: ["ownership", id], queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${id}/ownership`) });
  const { catalog, index } = useCatalog(instance.data?.gameKey);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["teams", id] });
  const create = useMutation({
    mutationFn: () => api.post(`/api/instances/${id}/teams`, { name: name.trim(), members: [] }),
    onSuccess: () => {
      setName("");
      void refresh();
    },
    onError: () => toast("Could not create the team", "err"),
  });
  const update = useMutation({
    mutationFn: (change: { teamId: string; name?: string; members?: string[]; companion?: string | null }) =>
      api.put(`/api/instances/${id}/teams/${change.teamId}`, { ...(change.name ? { name: change.name } : {}), ...(change.members ? { members: change.members } : {}), ...(change.companion !== undefined ? { companion: change.companion } : {}) }),
    onSuccess: refresh,
    onError: () => toast("Could not save the team", "err"),
  });
  const remove = useMutation({
    mutationFn: (teamId: string) => api.del(`/api/instances/${id}/teams/${teamId}`),
    onSuccess: refresh,
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || teams.isError) return <LoadError what="Teams" retry={() => Promise.all([instance.refetch(), teams.refetch()])} />;
  if (!instance.data || !game || !teams.data) return <div className="text-muted">Loading…</div>;

  const size = game.teamSize ?? 4;
  const companion = game.manifest.companion;
  const ownedIds = new Set((ownership.data ?? []).filter((ownedItem) => ownedItem.kind === "character").map((ownedItem) => ownedItem.catalogId));
  for (const build of builds.data ?? []) if (build.catalogId) ownedIds.add(build.catalogId);
  const units = [...(catalog?.characters ?? [])].sort((first, second) => Number(ownedIds.has(second.id)) - Number(ownedIds.has(first.id)) || first.name.localeCompare(second.name));
  const buildOf = (catalogId: string) => (builds.data ?? []).find((build) => build.catalogId === catalogId);
  // The build's weapon, from the catalog by its id or by the name the sheet gave it; and the sets its gear completes.
  const holder = weaponHolder(game);
  const weaponOf = (build: CharacterDto | undefined) => {
    const held = build && holder ? ((build.doc as Record<string, unknown>)[holder] as { catalogId?: string; name?: string } | undefined) : undefined;
    const entry = held?.catalogId ? index?.weapons.get(held.catalogId) : undefined;
    return entry ? { name: entry.name, icon: entry.icon } : held?.name ? { name: held.name, icon: undefined } : null;
  };
  const gearSets = new Map((catalog?.gear ?? []).map((gearSet) => [gearSet.name, gearSet]));

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="teams" gameKey={game.key} />
      </div>
      <form
        className="card tm-new"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <h3>Teams</h3>
        <span className="ch-sp" />
        <input aria-label="New team name" placeholder="New team name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
        <button className="btn primary" type="submit" disabled={!name.trim() || create.isPending}>
          Create team
        </button>
      </form>
      {!catalog && <p className="text-muted">{game.name} has no catalog yet, so its teams take units by hand once it does.</p>}
      <div className="tm-grid">
        {teams.data.map((team) => (
          <section key={team.id} className="card tm-team" aria-label={team.name}>
            <div className="spread">
              <input className="tm-name" aria-label="Team name" defaultValue={team.name} key={team.name} maxLength={80} onBlur={(event) => event.target.value.trim() && event.target.value.trim() !== team.name && update.mutate({ teamId: team.id, name: event.target.value.trim() })} />
              <button className="btn ghost" onClick={() => confirm(`Delete the team ${team.name}?`) && remove.mutate(team.id)}>
                Delete team
              </button>
            </div>
            {/* The game's party size, three or four (Georges, round 6), its companion beside it (ZZZ's Bangboo). */}
            <div className="tm-slots" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
              {team.members.map((member) => {
                const unit = index?.characters.get(member);
                const build = buildOf(member);
                const elementTint = elementColor(game.key, unit?.tag);
                const weapon = weaponOf(build);
                const sets = build ? new CharacterBuild(game, build.doc as Record<string, unknown>).completedSets : [];
                return (
                  <div key={member} className="tm-slot" style={elementTint ? ({ "--el": elementTint } as CSSProperties) : undefined}>
                    <Link className="tm-face" to={build ? `/characters/${build.id}` : `/games/${id}/units/${member}`} title={unit?.name ?? member}>
                      <GameIcon src={assetUrl(game.key, "character", unit?.icon)} fallback={communityAssetUrl(game.key, "character", unit?.icon)} alt={unit?.name ?? member} glyph="character" />
                    </Link>
                    {/* Its weapon and its sets, nothing more (round 26). */}
                    <span className="tm-gear">
                      {weapon && <CatalogIcon gameKey={game.key} kind="weapon" icon={weapon.icon} name={weapon.name} />}
                      {sets.map((completedSet) => (
                        <span key={completedSet.name} className="ch-set-icon" title={`${completedSet.name} ${completedSet.size}pc`}>
                          <CatalogIcon gameKey={game.key} kind="gear" icon={gearSets.get(completedSet.name)?.icon} name={completedSet.name} />
                          <b className="font-mono">{completedSet.size}</b>
                        </span>
                      ))}
                    </span>
                    <button className="btn ghost sm tm-remove" aria-label={`Remove ${unit?.name ?? member} from ${team.name}`} onClick={() => update.mutate({ teamId: team.id, members: team.members.filter((other) => other !== member) })}>
                      ×
                    </button>
                  </div>
                );
              })}
              {team.members.length < size && catalog && (
                <div className="tm-add">
                  <Picker
                    label={`Add a member to ${team.name}`}
                    glyph="character"
                    placeholder="+ Add a member"
                    value=""
                    options={units
                      .filter((character) => !team.members.includes(character.id))
                      .map((character) => ({ id: character.id, name: character.name, src: assetUrl(game.key, "character", character.icon), fallback: communityAssetUrl(game.key, "character", character.icon), sub: ownedIds.has(character.id) ? undefined : "not owned" }))}
                    onPick={(picked) => picked && update.mutate({ teamId: team.id, members: [...team.members, picked.id] })}
                  />
                </div>
              )}
            </div>
            {companion && (
              <div className="tm-companion">
                <span className="kpi-label">{companion.label}</span>
                {team.companion ? (
                  <span className="tm-companion-pick">
                    <CatalogIcon gameKey={game.key} kind="character" icon={index?.companions.get(team.companion)?.icon} name={index?.companions.get(team.companion)?.name ?? team.companion} />
                    <span>{index?.companions.get(team.companion)?.name ?? team.companion}</span>
                    <button className="btn ghost sm" aria-label={`Remove the ${companion.label} from ${team.name}`} onClick={() => update.mutate({ teamId: team.id, companion: null })}>
                      ×
                    </button>
                  </span>
                ) : (
                  <Picker
                    label={`${companion.label} of ${team.name}`}
                    glyph="bangboo"
                    placeholder={`+ ${companion.label}`}
                    value=""
                    options={(catalog?.companions ?? []).map((companionOption) => ({ id: companionOption.id, name: companionOption.name, src: assetUrl(game.key, "character", companionOption.icon), fallback: communityAssetUrl(game.key, "character", companionOption.icon), sub: `★${companionOption.rarity}` }))}
                    onPick={(picked) => picked && update.mutate({ teamId: team.id, companion: picked.id })}
                  />
                )}
              </div>
            )}
          </section>
        ))}
      </div>
      {teams.data.length === 0 && <p className="text-muted">No teams yet: name one above, then add its members.</p>}
    </>
  );
}
