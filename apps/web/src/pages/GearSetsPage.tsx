import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { CatalogGearSet, CharacterDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { GameIcon } from "../components/GameIcon";
import { GameTabs, gearLabel } from "../components/GameTabs";
import { GearInventory } from "../components/GearInventory";
import { ArtifactPlanner } from "../components/ArtifactPlanner";
import type { InstanceDetail } from "../lib/types";

/** Pieces per set name anywhere in a build doc (every game's gear pieces carry `setName`). */
function setCounts(node: unknown, out = new Map<string, number>()): Map<string, number> {
  if (Array.isArray(node)) node.forEach((n) => setCounts(n, out));
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.setName === "string" && o.setName) out.set(o.setName, (out.get(o.setName) ?? 0) + 1);
    for (const v of Object.values(o)) if (v && typeof v === "object") setCounts(v, out);
  }
  return out;
}

const maxRarity = (g: CatalogGearSet) => Math.max(0, ...((g.extra?.rarityList as number[] | undefined) ?? []));
const BONUS_LABELS = ["2-pc", "4-pc"];

/** Every gear set for a game: bonuses, where it drops, and which of your builds wear it. */
export function GearSetsPage() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<number | null>(null);
  const [usedOnly, setUsedOnly] = useState(false);
  const [view, setView] = useState<"sets" | "inventory" | "plan">("sets");

  const { data: instance } = useQuery({
    queryKey: ["instance", id],
    queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`),
    enabled: Boolean(id),
  });
  const { catalog, isLoading } = useCatalog(instance?.gameKey);
  const { data: builds } = useQuery({
    queryKey: ["builds", id],
    queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`),
    enabled: Boolean(id),
  });

  // set name → builds wearing it, with piece counts
  const usedBy = useMemo(() => {
    const m = new Map<string, { id: string; name: string; pieces: number }[]>();
    for (const b of builds ?? []) {
      for (const [set, pieces] of setCounts(b.doc)) {
        m.set(set, [...(m.get(set) ?? []), { id: b.id, name: b.name, pieces }]);
      }
    }
    return m;
  }, [builds]);

  if (!instance) return <div className="muted">Loading…</div>;
  if (isLoading) return <div className="muted">Loading catalog…</div>;
  const label = gearLabel(instance.gameKey);
  const sets = catalog?.gear ?? [];
  const rarities = [...new Set(sets.map(maxRarity))].filter(Boolean).sort((a, b) => b - a);
  const piecesOf = (g: CatalogGearSet) => (usedBy.get(g.name) ?? []).reduce((n, u) => n + u.pieces, 0);

  const shown = sets
    .filter(
      (g) =>
        (!search || g.name.toLowerCase().includes(search.toLowerCase()) || g.bonuses.some((b) => b.toLowerCase().includes(search.toLowerCase()))) &&
        (rarity === null || maxRarity(g) === rarity) &&
        (!usedOnly || usedBy.has(g.name)),
    )
    .sort((a, b) => piecesOf(b) - piecesOf(a) || maxRarity(b) - maxRarity(a) || a.name.localeCompare(b.name));

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="gear" gameKey={instance.gameKey} />
      </div>
      <div className="page-head">
        <div className="row">
          <h1 style={{ margin: 0 }}>{instance.name}</h1>
          <span className="badge">{label}</span>
          <span className="badge">{usedBy.size} used by your builds</span>
        </div>
        {instance.gameKey === "genshin" && (
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn sm ${view === "sets" ? "primary" : ""}`} onClick={() => setView("sets")}>Sets</button>
            <button className={`btn sm ${view === "inventory" ? "primary" : ""}`} onClick={() => setView("inventory")}>Inventory</button>
            <button className={`btn sm ${view === "plan" ? "primary" : ""}`} onClick={() => setView("plan")}>Plan</button>
          </div>
        )}
      </div>

      {view === "inventory" ? (
        <GearInventory instanceId={id!} gameKey={instance.gameKey} sets={sets} builds={builds ?? []} />
      ) : view === "plan" ? (
        <ArtifactPlanner instanceId={id!} gameKey={instance.gameKey} sets={sets} builds={builds ?? []} />
      ) : sets.length === 0 ? (
        <div className="card empty">No {label.toLowerCase()} in this game's catalog yet.</div>
      ) : (
        <>
          <div className="toolbar">
            <input placeholder="Search name or bonus…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
            <select value={rarity ?? ""} onChange={(e) => setRarity(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Any rarity</option>
              {rarities.map((r) => (
                <option key={r} value={r}>{"★".repeat(r)}</option>
              ))}
            </select>
            <label className="row small" style={{ margin: 0, gap: 6 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={usedOnly} onChange={(e) => setUsedOnly(e.target.checked)} />
              Used by my builds
            </label>
          </div>

          <div className="set-grid">
            {shown.map((g) => {
              const users = usedBy.get(g.name) ?? [];
              return (
                <div className={`card set-card ${users.length ? "in-use" : ""}`} key={g.id}>
                  <div className="set-head">
                    <GameIcon
                      src={assetUrl(instance.gameKey, "gear", g.icon)}
                      fallback={communityAssetUrl(instance.gameKey, "gear", g.icon)}
                      alt={g.name}
                      className="set-icon"
                    />
                    <div style={{ minWidth: 0 }}>
                      <div className="set-name">{g.name}</div>
                      <div className="small muted">
                        {maxRarity(g) > 0 && <span className="set-stars">{"★".repeat(maxRarity(g))}</span>}
                        {g.source && <> · {g.source}</>}
                      </div>
                    </div>
                  </div>
                  {g.bonuses.map((b, i) => (
                    <div className="set-bonus small" key={i}>
                      <span className="set-bonus-k">{g.bonuses.length === 1 ? "1-pc" : BONUS_LABELS[i] ?? `${i + 1}`}</span>
                      <span>{b}</span>
                    </div>
                  ))}
                  {users.length > 0 && (
                    <div className="chips">
                      {users.map((u) => (
                        <Link key={u.id} to={`/characters/${u.id}`} className="chip-toggle on">
                          {u.name} ×{u.pieces}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {shown.length === 0 && <div className="card empty" style={{ gridColumn: "1 / -1" }}>Nothing matches.</div>}
          </div>
        </>
      )}
    </>
  );
}
