import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MaterialNeedDto, MaterialStockDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { GameTabs } from "../components/GameTabs";
import { CatalogIcon } from "../components/CatalogIcon";
import type { InstanceDetail } from "../lib/types";

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Your material stock for a game, and what your farming goals still need. */
export function MaterialsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  // Unset until ticked: the needed ones alone while goals need some (round 11: the needed were lost among 300).
  const [neededOnlyPicked, setNeededOnlyPicked] = useState<boolean | null>(null);
  const [category, setCategory] = useState("");

  const { data: instance, isError, refetch } = useQuery({
    queryKey: ["instance", id],
    queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`),
    enabled: Boolean(id),
  });
  const { catalog, isLoading } = useCatalog(instance?.gameKey);
  const { data: stock } = useQuery({
    queryKey: ["stock", id],
    queryFn: () => api.get<MaterialStockDto[]>(`/api/instances/${id}/materials`),
    enabled: Boolean(id),
  });
  const { data: needed } = useQuery({
    queryKey: ["needed", id],
    queryFn: () => api.get<MaterialNeedDto[]>(`/api/instances/${id}/materials/needed`),
    enabled: Boolean(id),
  });

  const have = useMemo(() => new Map((stock ?? []).map((stockItem) => [stockItem.materialId, stockItem.qty])), [stock]);
  const need = useMemo(() => new Map((needed ?? []).map((neededItem) => [neededItem.materialId, neededItem])), [needed]);

  const setQty = useMutation({
    mutationFn: (request: { materialId: string; qty: number }) =>
      api.put(`/api/instances/${id}/materials`, { items: [request] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock", id] });
      queryClient.invalidateQueries({ queryKey: ["needed", id] });
    },
    onError: () => toast("Could not save stock", "err"),
  });

  if (isError) return <LoadError what="Materials" retry={refetch} />;
  if (!instance) return <div className="muted">Loading…</div>;
  if (isLoading) return <div className="muted">Loading catalog…</div>;
  if (!catalog) return <div className="card empty">This game has no materials catalog.</div>;

  const neededOnly = neededOnlyPicked ?? (needed ?? []).some((materialNeed) => materialNeed.needed > 0);
  const searchText = search.toLowerCase();
  const categories = [...new Set(catalog.materials.map((material) => material.category))].sort();
  const rows = catalog.materials.filter(
    (material) =>
      (!searchText || material.name.toLowerCase().includes(searchText)) &&
      (!neededOnly || (need.get(material.id)?.needed ?? 0) > 0) &&
      (!category || material.category === category),
  );
  const byCategory = new Map<string, typeof rows>();
  for (const material of rows) {
    const list = byCategory.get(material.category) ?? [];
    list.push(material);
    byCategory.set(material.category, list);
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="materials" gameKey={instance?.gameKey} />
      </div>
      <div className="page-head">
        <div className="row">
          <span className="badge">Materials</span>
          {needed && needed.length > 0 && <span className="badge todo">{needed.length} needed</span>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <input aria-label="Search" placeholder="Search…" value={search} onChange={(event) => setSearch(event.target.value)} style={{ maxWidth: 240 }} />
          <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <label className="row small" style={{ margin: 0, gap: 6 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={neededOnly} onChange={(event) => setNeededOnlyPicked(event.target.checked)} />
            Needed only
          </label>
          <span className="small muted">Enter what you have; "missing" updates from your farming goals.</span>
        </div>
      </div>

      {[...byCategory.entries()].map(([category, list]) => (
        <div className="card" key={category} style={{ marginBottom: 14 }}>
          <h3>{category}</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr><th>Material</th><th>Have</th><th>Needed</th><th>Missing</th><th>Days</th></tr>
              </thead>
              <tbody>
                {list.map((material) => {
                  const neededRow = need.get(material.id);
                  const held = have.get(material.id) ?? 0;
                  const missing = Math.max(0, (neededRow?.needed ?? 0) - held);
                  return (
                    <tr key={material.id}>
                      <td>
                        <span className="materials-name">
                          <CatalogIcon gameKey={instance.gameKey} kind="material" icon={material.icon} name={material.name} className="materials-icon" />
                          {material.name}
                        </span>
                        {material.source ? <div className="small muted">{material.source}</div> : null}
                      </td>
                      <td>
                        <input type="number" aria-label={`${material.name} in stock`} min={0} style={{ width: 90 }} defaultValue={held}
                          onBlur={(event) => { const qty = Math.max(0, Number(event.target.value)); if (qty !== held) setQty.mutate({ materialId: material.id, qty }); }} />
                      </td>
                      <td>{neededRow?.needed ?? 0}</td>
                      <td style={{ color: missing ? "var(--accent)" : "var(--muted)" }}>{missing || "—"}</td>
                      <td className="small">
                        {material.availability?.length ? (
                          <>
                            {material.availability.map((day) => DAYS[day]).join(" ")}{" "}
                            {neededRow?.material?.farmableToday ? <span className="badge done">today</span> : null}
                          </>
                        ) : <span className="muted">any</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {rows.length === 0 && <div className="card empty">Nothing matches.</div>}
    </>
  );
}
