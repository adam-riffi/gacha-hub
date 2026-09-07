import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CatalogCharacter, CatalogWeapon, OwnershipDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
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
  const builtIds = useMemo(
    () => new Set((instance?.characters ?? []).map((c) => c.catalogId).filter(Boolean)),
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

  const tags = useMemo(
    () => [...new Set(entries.map(tagOf).filter((t): t is string => Boolean(t)))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, kind],
  );
  const rarities = useMemo(() => [...new Set(entries.map((e) => e.rarity))].sort((a, b) => b - a), [entries]);

  const shown = entries.filter(
    (e) =>
      (!search || e.name.toLowerCase().includes(search.toLowerCase())) &&
      (rarity === null || e.rarity === rarity) &&
      (tag === null || tagOf(e) === tag),
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
      <div className="page-head">
        <div className="row">
          <button className="btn ghost sm" onClick={() => nav(`/games/${id}`)}>← {instance.name}</button>
          <h1 style={{ margin: 0 }}>Ownership</h1>
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

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
          <select value={rarity ?? ""} onChange={(e) => setRarity(e.target.value ? Number(e.target.value) : null)} style={{ maxWidth: 140 }}>
            <option value="">Any rarity</option>
            {rarities.map((r) => (
              <option key={r} value={r}>{stars(r)}</option>
            ))}
          </select>
          {tags.length > 0 && (
            <select value={tag ?? ""} onChange={(e) => setTag(e.target.value || null)} style={{ maxWidth: 180 }}>
              <option value="">Any {kind === "character" ? "element" : "type"}</option>
              {tags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
          <span style={{ flex: 1 }} />
          <button
            className="btn sm"
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
      </div>

      <div className="grid cols-3">
        {shown.map((e) => {
          const isOwned = ownedIds.has(e.id);
          const hasBuild = kind === "character" && builtIds.has(e.id);
          return (
            <div className="card" key={e.id} style={{ opacity: isOwned ? 1 : 0.7 }}>
              <div className="spread">
                <div>
                  <strong>{e.name}</strong>
                  <div className="small muted">
                    {stars(e.rarity)} {tagOf(e) ? `· ${tagOf(e)}` : ""}
                  </div>
                </div>
                <label className="row" style={{ margin: 0, gap: 6 }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto" }}
                    checked={isOwned}
                    onChange={(ev) => setOwnership.mutate([{ kind, catalogId: e.id, owned: ev.target.checked }])}
                  />
                  <span className="small">Owned</span>
                </label>
              </div>
              {kind === "character" && isOwned && (
                <div style={{ marginTop: 10 }}>
                  {hasBuild ? (
                    <span className="badge done">build exists</span>
                  ) : (
                    <button className="btn sm" disabled={createBuild.isPending} onClick={() => createBuild.mutate(e.id)}>
                      + Create build
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {shown.length === 0 && <div className="card empty">Nothing matches.</div>}
      </div>
    </>
  );
}
