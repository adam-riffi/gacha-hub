import { useMemo, useState } from "react";
import { Rarity } from "../components/Rarity";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { baseStatsAt, isPercent, type CatalogCharacter, type CatalogWeapon, type OwnershipDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { GameTabs } from "../components/GameTabs";
import { GameIcon } from "../components/GameIcon";
import { artGlyph } from "../components/Glyph";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import type { InstanceDetail } from "../lib/types";
import { Segmented } from "../components/ui";
import { StatIcon } from "../components/StatIcon";

/**
 * A weapon's stats at its top level (round 28, Georges: "the main stats like the atk and crit damage should be shown
 * explicitly on each weapon"): the catalog's base stats, each rounded, a percent where the game says so; its second stat
 * by name alone when the catalog has no figures (Wuthering Waves).
 */
function weaponStats(gameKey: string, weapon: CatalogWeapon): { name: string; value: string }[] {
  const at = baseStatsAt(weapon, weapon.maxLevel);
  const rows = at ? Object.entries(at).map(([name, value]) => ({ name, value: `${Math.round(value)}${isPercent(gameKey, name) ? "%" : ""}` })) : [];
  return weapon.mainStat && !rows.some((row) => row.name === weapon.mainStat) ? [...rows, { name: weapon.mainStat, value: "" }] : rows;
}

type Kind = "character" | "weapon";
const stars = (count: number) => "★".repeat(Math.max(0, Math.min(6, count)));

/** Check/uncheck what you own for one game, then start builds from it. */
export function OwnershipPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("character");
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<number | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [ownState, setOwnState] = useState<"all" | "owned" | "unowned">("all");

  const { data: instance, isError, refetch } = useQuery({
    queryKey: ["instance", id],
    queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`),
    enabled: Boolean(id),
  });
  const { catalog, isLoading: catalogLoading } = useCatalog(instance?.gameKey);
  const { data: owned } = useQuery({
    queryKey: ["ownership", id],
    queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${id}/ownership`),
    enabled: Boolean(id),
  });

  const ownedIds = useMemo(
    () => new Set((owned ?? []).filter((ownedItem) => ownedItem.kind === kind).map((ownedItem) => ownedItem.catalogId)),
    [owned, kind],
  );
  // catalogId → the existing build's character id, so owned characters with a
  // build link straight to it (instead of the edit affordance disappearing).
  const buildByCatalog = useMemo(
    () =>
      new Map(
        (instance?.characters ?? [])
          .filter((character): character is typeof character & { catalogId: string } => Boolean(character.catalogId))
          .map((character) => [character.catalogId, character.id]),
      ),
    [instance],
  );

  const setOwnership = useMutation({
    mutationFn: (items: { kind: Kind; catalogId: string; owned: boolean }[]) =>
      api.put(`/api/instances/${id}/ownership`, { items }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ownership", id] }),
    onError: () => toast("Could not save ownership", "err"),
  });

  const createBuild = useMutation({
    mutationFn: (catalogId: string) =>
      api.post<{ id: string }>(`/api/instances/${id}/characters`, { catalogId }),
    onSuccess: (_result) => {
      queryClient.invalidateQueries({ queryKey: ["instance", id] });
      queryClient.invalidateQueries({ queryKey: ["ownership", id] });
      navigate(`/characters/${_result.id}`);
    },
    onError: () => toast("Could not create build", "err"),
  });

  const entries: (CatalogCharacter | CatalogWeapon)[] =
    kind === "character" ? (catalog?.characters ?? []) : (catalog?.weapons ?? []);
  const tagOf = (entry: CatalogCharacter | CatalogWeapon) =>
    kind === "character" ? (entry as CatalogCharacter).tag : (entry as CatalogWeapon).type;

  // Cheap enough to recompute per render (a few hundred entries); avoids
  // memo dependencies on values that change identity every render.
  const tags = [...new Set(entries.map(tagOf).filter((tagValue): tagValue is string => Boolean(tagValue)))].sort();
  const rarities = [...new Set(entries.map((entry) => entry.rarity))].sort((first, second) => second - first);

  // Owned first (round 28, Georges: "owned things should come on top every time whether its chars or weapons"), the catalog's order within.
  const shown = entries
    .filter(
      (entry) =>
        (!search || entry.name.toLowerCase().includes(search.toLowerCase())) &&
        (rarity === null || entry.rarity === rarity) &&
        (tag === null || tagOf(entry) === tag) &&
        (ownState === "all" || (ownState === "owned") === ownedIds.has(entry.id)),
    )
    .sort((first, second) => Number(ownedIds.has(second.id)) - Number(ownedIds.has(first.id)));

  if (isError) return <LoadError what="Owned units" retry={refetch} />;
  if (!instance) return <div className="muted">Loading…</div>;
  if (catalogLoading) return <div className="muted">Loading catalog…</div>;
  if (!catalog) {
    return (
      <>
        <div className="page-head">
          <h1>Ownership</h1>
        </div>
        <div className="card empty">This game has no catalog yet — builds are created by name on the game page.</div>
      </>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="ownership" gameKey={instance.gameKey} />
      </div>
      <div className="page-head">
        <div className="row">
          <span className="badge">Ownership</span>
          <span className="badge">
            {ownedIds.size} / {entries.length} owned
          </span>
        </div>
        <div className="row">
          <Segmented
            label="Show"
            value={kind}
            onChange={setKind}
            options={[
              { value: "character", label: "Characters" },
              { value: "weapon", label: "Weapons" },
            ]}
          />
        </div>
      </div>

      <div className="toolbar">
        <input aria-label="Search" placeholder="Search…" value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: 200 }} />
        <select aria-label="Rarity" value={rarity ?? ""} onChange={(event) => setRarity(event.target.value ? Number(event.target.value) : null)}>
          <option value="">Any rarity</option>
          {rarities.map((rarityOption) => (
            <option key={rarityOption} value={rarityOption}>{stars(rarityOption)}</option>
          ))}
        </select>
        {tags.length > 0 && (
          <select aria-label="Element" value={tag ?? ""} onChange={(event) => setTag(event.target.value || null)}>
            <option value="">Any {kind === "character" ? "element" : "type"}</option>
            {tags.map((tagOption) => (
              <option key={tagOption} value={tagOption}>{tagOption}</option>
            ))}
          </select>
        )}
        <select aria-label="Owned or not" value={ownState} onChange={(event) => setOwnState(event.target.value as typeof ownState)}>
          <option value="all">All</option>
          <option value="owned">Owned</option>
          <option value="unowned">Not owned</option>
        </select>
        <span style={{ flex: 1 }} />
        <button
          className="btn sm ghost"
          disabled={setOwnership.isPending || shown.length === 0}
          onClick={() => setOwnership.mutate(shown.map((entry) => ({ kind, catalogId: entry.id, owned: true })))}
        >
          Own all shown
        </button>
        <button
          className="btn sm ghost"
          disabled={setOwnership.isPending || shown.length === 0}
          onClick={() => setOwnership.mutate(shown.map((entry) => ({ kind, catalogId: entry.id, owned: false })))}
        >
          Clear shown
        </button>
      </div>

      <div className="roster">
        {shown.map((entry) => {
          const isOwned = ownedIds.has(entry.id);
          const buildId = kind === "character" ? buildByCatalog.get(entry.id) : undefined;
          return (
            <div className={`rtile r${entry.rarity} ${isOwned ? "" : "off"}`} key={entry.id}>
              <button
                type="button"
                className="rtile-art"
                title={isOwned ? "Owned — click to unmark" : "Click to mark owned"}
                onClick={() => setOwnership.mutate([{ kind, catalogId: entry.id, owned: !isOwned }])}
              >
                <GameIcon
                  src={assetUrl(instance.gameKey, kind, entry.icon)}
                  fallback={communityAssetUrl(instance.gameKey, kind, entry.icon)}
                  alt={entry.name}
                  glyph={artGlyph(kind)}
                />
                {isOwned && <span className="rtile-check">✓</span>}
              </button>
              <div className="rtile-name" title={entry.name}>{entry.name}</div>
              <div className="rtile-meta">
                <Rarity value={entry.rarity} />
                {tagOf(entry) ? <span>{tagOf(entry)}</span> : null}
              </div>
              {kind === "weapon" && (
                <div className="rtile-stats font-mono">
                  {weaponStats(instance.gameKey, entry as CatalogWeapon).map((stat) => (
                    <span key={stat.name} className="rtile-stat" title={`${stat.name} ${stat.value}`.trim()}>
                      <StatIcon stat={stat.name} />
                      {stat.value && <b>{stat.value}</b>}
                      <small>{stat.name}</small>
                    </span>
                  ))}
                </div>
              )}
              {kind === "character" && isOwned &&
                (buildId ? (
                  <Link className="rtile-build" to={`/characters/${buildId}`}>Build →</Link>
                ) : (
                  <button className="rtile-build" disabled={createBuild.isPending} onClick={() => createBuild.mutate(entry.id)}>
                    + Build
                  </button>
                ))}
            </div>
          );
        })}
        {shown.length === 0 && <div className="card empty" style={{ gridColumn: "1 / -1" }}>Nothing matches.</div>}
      </div>
    </>
  );
}
