import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { levelCaps, type CatalogWeapon, type OwnershipDto, type PlanGenerateResultDto, type PlanPreviewDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { PlanTable } from "../components/TaskGeneratorPanel";
import type { InstanceDetail } from "../lib/types";

const stars = (n: number) => "★".repeat(Math.max(0, Math.min(6, n)));

function WeaponFarm({ instanceId, weapon, onDone }: { instanceId: string; weapon: CatalogWeapon; onDone: () => void }) {
  const toast = useToast();
  const caps = useMemo(() => levelCaps(weapon.ascension, 20), [weapon]);
  const [from, setFrom] = useState(caps[0] ?? 20);
  const [to, setTo] = useState(caps.at(-1) ?? 90);
  const [preview, setPreview] = useState<PlanPreviewDto | null>(null);
  const body = { kind: "weapon" as const, catalogId: weapon.id, level: { from, to } };
  const previewMut = useMutation({
    mutationFn: () => api.post<PlanPreviewDto>(`/api/instances/${instanceId}/plans/preview`, body),
    onSuccess: setPreview,
  });
  const generate = useMutation({
    mutationFn: () => api.post<PlanGenerateResultDto>(`/api/instances/${instanceId}/plans/generate`, body),
    onSuccess: (r) => {
      toast(`${r.created} task(s) created, ${r.updated} updated`);
      onDone();
    },
    onError: () => toast("Could not generate tasks", "err"),
  });
  return (
    <div style={{ marginTop: 10 }}>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div><label>From cap</label><select value={from} onChange={(e) => setFrom(Number(e.target.value))}>{caps.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label>To</label><select value={to} onChange={(e) => setTo(Number(e.target.value))}>{caps.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <button className="btn sm" disabled={to <= from || previewMut.isPending} onClick={() => previewMut.mutate()}>Preview</button>
        <button className="btn sm primary" disabled={to <= from || generate.isPending} onClick={() => generate.mutate()}>Farm</button>
      </div>
      {preview && <div style={{ marginTop: 8 }}><PlanTable preview={preview} /></div>}
    </div>
  );
}

/** Weapons + gear sets for a game: ownership, and farm / pre-farm planning. */
export function EquipmentPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<"weapons" | "gear">("weapons");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const { data: instance } = useQuery({
    queryKey: ["instance", id],
    queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`),
    enabled: Boolean(id),
  });
  const { catalog, isLoading } = useCatalog(instance?.gameKey);
  const { data: owned } = useQuery({
    queryKey: ["ownership", id],
    queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${id}/ownership`),
    enabled: Boolean(id),
  });
  const ownedWeapons = useMemo(() => new Set((owned ?? []).filter((o) => o.kind === "weapon").map((o) => o.catalogId)), [owned]);

  const setOwned = useMutation({
    mutationFn: (v: { catalogId: string; owned: boolean }) =>
      api.put(`/api/instances/${id}/ownership`, { items: [{ kind: "weapon", ...v }] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ownership", id] }),
  });
  const farmSet = useMutation({
    mutationFn: (g: { id: string; name: string; slots: string[] }) =>
      api.post("/api/tasks", {
        scope: "game", refId: id, type: "goal", title: `Farm ${g.name} (${g.slots.length} pieces)`,
        target: g.slots.length, progress: 0, origin: { kind: "gear", catalogId: g.id },
      }),
    onSuccess: () => {
      toast("Farming goal created");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (!instance) return <div className="muted">Loading…</div>;
  if (isLoading) return <div className="muted">Loading catalog…</div>;
  if (!catalog) return <div className="card empty">This game has no equipment catalog.</div>;

  const q = search.toLowerCase();
  const weapons = catalog.weapons.filter((w) => !q || w.name.toLowerCase().includes(q));
  const gear = catalog.gear.filter((g) => !q || g.name.toLowerCase().includes(q));

  return (
    <>
      <div className="page-head">
        <div className="row">
          <button className="btn ghost sm" onClick={() => nav(`/games/${id}`)}>← {instance.name}</button>
          <h1 style={{ margin: 0 }}>Equipment</h1>
        </div>
        <div className="row">
          <button className={`btn sm ${tab === "weapons" ? "primary" : ""}`} onClick={() => setTab("weapons")}>Weapons ({catalog.weapons.length})</button>
          <button className={`btn sm ${tab === "gear" ? "primary" : ""}`} onClick={() => setTab("gear")}>Gear sets ({catalog.gear.length})</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
      </div>

      {tab === "weapons" ? (
        <div className="grid cols-2">
          {weapons.map((w) => (
            <div className="card" key={w.id}>
              <div className="spread">
                <div>
                  <strong>{w.name}</strong>
                  <div className="small muted">{stars(w.rarity)} {w.type ? `· ${w.type}` : ""} · max {w.maxLevel}</div>
                </div>
                <div className="row">
                  <label className="row small" style={{ margin: 0, gap: 6 }}>
                    <input type="checkbox" style={{ width: "auto" }} checked={ownedWeapons.has(w.id)}
                      onChange={(e) => setOwned.mutate({ catalogId: w.id, owned: e.target.checked })} />
                    Owned
                  </label>
                  {w.ascension.length > 0 && (
                    <button className="btn sm" onClick={() => setOpen(open === w.id ? null : w.id)}>
                      {open === w.id ? "Close" : "Farm / pre-farm"}
                    </button>
                  )}
                </div>
              </div>
              {open === w.id && <WeaponFarm instanceId={instance.id} weapon={w} onDone={() => setOpen(null)} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid cols-2">
          {gear.map((g) => (
            <div className="card" key={g.id}>
              <div className="spread">
                <strong>{g.name}</strong>
                <button className="btn sm" disabled={farmSet.isPending} onClick={() => farmSet.mutate(g)}>Farm set</button>
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>{g.slots.length} slots{g.source ? ` · ${g.source}` : ""}</div>
              <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {g.bonuses.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
