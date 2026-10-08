import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CatalogCharacter, CatalogWeapon, OwnershipDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { GameTabs } from "../components/GameTabs";
import { GameIcon } from "../components/GameIcon";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import type { InstanceDetail } from "../lib/types";

type Kind = "character" | "weapon";
const stars = (n: number) => "★".repeat(Math.max(0, Math.min(6, n)));

/** Check/uncheck what you own for one game, then start builds from it. */
export function OwnershipPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("character");
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<number | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [ownState, setOwnState] = useState<"all" | "owned" | "unowned">("all");

  const { data: instance } = useQuery({
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
    () => new Set((owned ?? []).filter((o) => o.kind === kind).map((o) => o.catalogId)),
    [owned, kind],
  );
  // catalogId → the existing build's character id, so owned characters with a
  // build link straight to it (instead of the edit affordance disappearing).
  const buildByCatalog = useMemo(
    () =>
      new Map(
        (instance?.characters ?? [])
          .filter((c): c is typeof c & { catalogId: string } => Boolean(c.catalogId))
          .map((c) => [c.catalogId, c.id]),
      ),
    [instance],
  );

  const setOwnership = useMutation({
    mutationFn: (items: { kind: Kind; catalogId: string; owned: boolean }[]) =>
      api.put(`/api/instances/${id}/ownership`, { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ownership", id] }),
    onError: () => toast("Could not save ownership", "err"),
  });

  const createBuild = useMutation({
    mutationFn: (catalogId: string) =>
      api.post<{ id: string }>(`/api/instances/${id}/characters`, { catalogId }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["instance", id] });
      qc.invalidateQueries({ queryKey: ["ownership", id] });
      nav(`/characters/${r.id}`);
    },
    onError: () => toast("Could not create build", "err"),
  });

  const entries: (CatalogCharacter | CatalogWeapon)[] =
    kind === "character" ? (catalog?.characters ?? []) : (catalog?.weapons ?? []);
  const tagOf = (e: CatalogCharacter | CatalogWeapon) =>
    kind === "character" ? (e as CatalogCharacter).tag : (e as CatalogWeapon).type;

  // Cheap enough to recompute per render (a few hundred entries); avoids
  // memo dependencies on values that change identity every render.
  const tags = [...new Set(entries.map(tagOf).filter((t): t is string => Boolean(t)))].sort();
  const rarities = [...new Set(entries.map((e) => e.rarity))].sort((a, b) => b - a);

  const shown = entries.filter(
    (e) =>
      (!search || e.name.toLowerCase().includes(search.toLowerCase())) &&
      (rarity === null || e.rarity === rarity) &&
      (tag === null || tagOf(e) === tag) &&
      (ownState === "all" || (ownState === "owned") === ownedIds.has(e.id)),
  );

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
          <h1 style={{ margin: 0 }}>{instance.name}</h1>
          <span className="badge">Ownership</span>
          <span className="badge">
            {ownedIds.size} / {entries.length} owned
          </span>
        </div>
        <div className="row">
          <button className={`btn sm ${kind === "character" ? "primary" : ""}`} onClick={() => setKind("character")}>
            Characters
          </button>
          <button className={`btn sm ${kind === "weapon" ? "primary" : ""}`} onClick={() => setKind("weapon")}>
            Weapons
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input aria-label="Search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
        <select aria-label="Rarity" value={rarity ?? ""} onChange={(e) => setRarity(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Any rarity</option>
          {rarities.map((r) => (
            <option key={r} value={r}>{stars(r)}</option>
          ))}
        </select>
        {tags.length > 0 && (
          <select aria-label="Element" value={tag ?? ""} onChange={(e) => setTag(e.target.value || null)}>
            <option value="">Any {kind === "character" ? "element" : "type"}</option>
            {tags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <select aria-label="Owned or not" value={ownState} onChange={(e) => setOwnState(e.target.value as typeof ownState)}>
          <option value="all">All</option>
          <option value="owned">Owned</option>
          <option value="unowned">Not owned</option>
        </select>
        <span style={{ flex: 1 }} />
        <span className="small muted">Click a portrait to mark it owned.</span>
        <button
          className="btn sm ghost"
          disabled={setOwnership.isPending || shown.length === 0}
          onClick={() => setOwnership.mutate(shown.map((e) => ({ kind, catalogId: e.id, owned: true })))}
        >
          Own all shown
        </button>
        <button
          className="btn sm ghost"
          disabled={setOwnership.isPending || shown.length === 0}
          onClick={() => setOwnership.mutate(shown.map((e) => ({ kind, catalogId: e.id, owned: false })))}
        >
          Clear shown
        </button>
      </div>

      <div className="roster">
        {shown.map((e) => {
          const isOwned = ownedIds.has(e.id);
          const buildId = kind === "character" ? buildByCatalog.get(e.id) : undefined;
          return (
            <div className={`rtile r${e.rarity} ${isOwned ? "" : "off"}`} key={e.id}>
              <button
                type="button"
                className="rtile-art"
                title={isOwned ? "Owned — click to unmark" : "Click to mark owned"}
                onClick={() => setOwnership.mutate([{ kind, catalogId: e.id, owned: !isOwned }])}
              >
                <GameIcon
                  src={assetUrl(instance.gameKey, kind, e.icon)}
                  fallback={communityAssetUrl(instance.gameKey, kind, e.icon)}
                  alt={e.name}
                />
                {isOwned && <span className="rtile-check">✓</span>}
              </button>
              <div className="rtile-name" title={e.name}>{e.name}</div>
              <div className="rtile-meta">
                {stars(e.rarity)}
                {tagOf(e) ? ` · ${tagOf(e)}` : ""}
              </div>
              {kind === "character" && isOwned &&
                (buildId ? (
                  <Link className="rtile-build" to={`/characters/${buildId}`}>Build →</Link>
                ) : (
                  <button className="rtile-build" disabled={createBuild.isPending} onClick={() => createBuild.mutate(e.id)}>
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
