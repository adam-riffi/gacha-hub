import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MaterialNeedDto, MaterialStockDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { GameTabs } from "../components/GameTabs";
import type { InstanceDetail } from "../lib/types";

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Your material stock for a game, and what your farming goals still need. */
export function MaterialsPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [neededOnly, setNeededOnly] = useState(false);
  const [category, setCategory] = useState("");

  const { data: instance } = useQuery({
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

  const have = useMemo(() => new Map((stock ?? []).map((s) => [s.materialId, s.qty])), [stock]);
  const need = useMemo(() => new Map((needed ?? []).map((n) => [n.materialId, n])), [needed]);

  const setQty = useMutation({
    mutationFn: (v: { materialId: string; qty: number }) =>
      api.put(`/api/instances/${id}/materials`, { items: [v] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock", id] });
      qc.invalidateQueries({ queryKey: ["needed", id] });
    },
    onError: () => toast("Could not save stock", "err"),
  });

  if (!instance) return <div className="muted">Loading…</div>;
  if (isLoading) return <div className="muted">Loading catalog…</div>;
  if (!catalog) return <div className="card empty">This game has no materials catalog.</div>;

  const q = search.toLowerCase();
  const categories = [...new Set(catalog.materials.map((m) => m.category))].sort();
  const rows = catalog.materials.filter(
    (m) =>
      (!q || m.name.toLowerCase().includes(q)) &&
      (!neededOnly || (need.get(m.id)?.needed ?? 0) > 0) &&
      (!category || m.category === category),
  );
  const byCategory = new Map<string, typeof rows>();
  for (const m of rows) {
    const list = byCategory.get(m.category) ?? [];
    list.push(m);
    byCategory.set(m.category, list);
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="materials" />
      </div>
      <div className="page-head">
        <div className="row">
          <h1 style={{ margin: 0 }}>{instance.name}</h1>
          <span className="badge">Materials</span>
          {needed && needed.length > 0 && <span className="badge todo">{needed.length} needed</span>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <label className="row small" style={{ margin: 0, gap: 6 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={neededOnly} onChange={(e) => setNeededOnly(e.target.checked)} />
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
                {list.map((m) => {
                  const n = need.get(m.id);
                  const h = have.get(m.id) ?? 0;
                  const missing = Math.max(0, (n?.needed ?? 0) - h);
                  return (
                    <tr key={m.id}>
                      <td>
                        {m.name}
                        {m.source ? <div className="small muted">{m.source}</div> : null}
                      </td>
                      <td>
                        <input type="number" min={0} style={{ width: 90 }} defaultValue={h}
                          onBlur={(e) => { const qty = Math.max(0, Number(e.target.value)); if (qty !== h) setQty.mutate({ materialId: m.id, qty }); }} />
                      </td>
                      <td>{n?.needed ?? 0}</td>
                      <td style={{ color: missing ? "var(--accent)" : "var(--muted)" }}>{missing || "—"}</td>
                      <td className="small">
                        {m.availability?.length ? (
                          <>
                            {m.availability.map((d) => DAYS[d]).join(" ")}{" "}
                            {n?.material?.farmableToday ? <span className="badge done">today</span> : null}
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
