import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PullBannerLogDto, PullLogDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { GameIcon } from "../components/GameIcon";
import { GameTabs } from "../components/GameTabs";
import type { InstanceDetail } from "../lib/types";

type Unit = { id: string; name: string; icon?: string; kind: "character" | "weapon" };
type AddBody = { bannerKey: string; count: number; fiveStarAt?: number; featured?: boolean; catalogId?: string };
type CalibrateBody = { bannerKey: string; pity: number; guaranteed: boolean };

function PullBanner({
  b,
  gameKey,
  units,
  unitOf,
  onAdd,
  onCalibrate,
  onUndo,
}: {
  b: PullBannerLogDto;
  gameKey: string;
  units: Unit[];
  unitOf: (id: string | null) => Unit | undefined;
  onAdd: (body: AddBody) => void;
  onCalibrate: (body: CalibrateBody) => void;
  onUndo: (entryId: string) => void;
}) {
  const [mode, setMode] = useState<"five" | "set" | null>(null);
  const [count, setCount] = useState(10);
  const [at, setAt] = useState(10);
  const [featured, setFeatured] = useState(true);
  const [unit, setUnit] = useState("");
  const [pity, setPity] = useState(0);
  const [guaranteed, setGuaranteed] = useState(false);
  const hasFeatured = b.featuredRate < 1;
  const s = b.state;

  return (
    <div className="card pull-banner">
      <div className="spread">
        <h3 style={{ margin: 0 }}>{b.label}</h3>
        <span className="row" style={{ gap: 4 }}>
          {s.inSoftPity && <span className="badge todo">Soft pity</span>}
          {s.guaranteed && <span className="badge done">Guaranteed</span>}
        </span>
      </div>
      <div className="pull-pity">
        <span data-testid="pity">{s.pity}</span>
        <span className="muted"> / {b.hardPity}</span>
      </div>
      <div className="meter">
        <span style={{ width: `${Math.min(100, (s.pity / b.hardPity) * 100)}%` }} />
      </div>
      <p className="small muted" style={{ margin: "6px 0 10px" }}>
        {s.toHardPity} to a certain 5★
        {hasFeatured && (s.guaranteed ? ", and it will be the featured one" : ` · ${Math.round(b.featuredRate * 100)}% it is the featured one`)}
      </p>

      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm" onClick={() => onAdd({ bannerKey: b.key, count: 1 })}>+1</button>
        <button className="btn sm" onClick={() => onAdd({ bannerKey: b.key, count: 10 })}>+10</button>
        <button className={`btn sm ${mode === "five" ? "primary" : ""}`} onClick={() => setMode(mode === "five" ? null : "five")}>Log a 5★</button>
        <button className={`btn sm ghost ${mode === "set" ? "primary" : ""}`} onClick={() => { setPity(s.pity); setGuaranteed(s.guaranteed); setMode(mode === "set" ? null : "set"); }}>Set pity</button>
        {b.recent[0] && (
          <button className="btn sm ghost" title="Delete the latest entry" onClick={() => onUndo(b.recent[0]!.id)}>Undo</button>
        )}
      </div>

      {mode === "five" && (
        <form
          className="pull-form"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd({ bannerKey: b.key, count, fiveStarAt: Math.min(at, count), ...(hasFeatured ? { featured } : {}), ...(unit ? { catalogId: unit } : {}) });
            setMode(null);
          }}
        >
          <label>Pulls in the batch <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label>
          <label>5★ at pull <input type="number" min={1} max={count} value={at} onChange={(e) => setAt(Number(e.target.value))} /></label>
          {hasFeatured && (
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured
            </label>
          )}
          <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Which 5★">
            <option value="">Which 5★ (optional)</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="btn sm primary" type="submit">Save 5★</button>
        </form>
      )}

      {mode === "set" && (
        <form
          className="pull-form"
          onSubmit={(e) => {
            e.preventDefault();
            onCalibrate({ bannerKey: b.key, pity, guaranteed: hasFeatured && guaranteed });
            setMode(null);
          }}
        >
          <label>Current pity <input type="number" min={0} max={b.hardPity - 1} value={pity} onChange={(e) => setPity(Number(e.target.value))} /></label>
          {hasFeatured && (
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={guaranteed} onChange={(e) => setGuaranteed(e.target.checked)} /> Guaranteed
            </label>
          )}
          <button className="btn sm primary" type="submit">Save pity</button>
        </form>
      )}

      {b.fiveStars.length > 0 && (
        <div className="stack" style={{ gap: 6, marginTop: 12 }}>
          {b.fiveStars.slice(0, 8).map((d) => {
            const u = unitOf(d.catalogId);
            return (
              <div className="pull-drop" key={d.id}>
                <GameIcon src={assetUrl(gameKey, u?.kind ?? "character", u?.icon)} fallback={communityAssetUrl(gameKey, u?.kind ?? "character", u?.icon)} alt={u?.name ?? "5★"} className="pull-drop-art" />
                <span className="ov-ellipsis">{u?.name ?? "5★"}</span>
                <span className="small muted">at pity {d.pity}</span>
                {d.featured === false && <span className="badge">lost {Math.round(b.featuredRate * 100)}/{100 - Math.round(b.featuredRate * 100)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Pull log per banner type: pity, guarantee and every 5★ (ADR 0002). */
export function PullsPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: instance } = useQuery({
    queryKey: ["instance", id],
    queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`),
    enabled: Boolean(id),
  });
  const { data: log } = useQuery({
    queryKey: ["pulls", id],
    queryFn: () => api.get<PullLogDto>(`/api/instances/${id}/pulls`),
    enabled: Boolean(id),
  });
  const { catalog, index } = useCatalog(instance?.gameKey);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pulls", id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const failed = () => toast("That would pass hard pity, or the entry is invalid", "err");
  const add = useMutation({ mutationFn: (body: AddBody) => api.post(`/api/instances/${id}/pulls`, body), onSuccess: refresh, onError: failed });
  const calibrate = useMutation({ mutationFn: (body: CalibrateBody) => api.post(`/api/instances/${id}/pulls/calibrate`, body), onSuccess: refresh, onError: failed });
  const undo = useMutation({ mutationFn: (entryId: string) => api.del(`/api/instances/${id}/pulls/${entryId}`), onSuccess: refresh });

  if (!instance || !log) return <div className="muted">Loading…</div>;

  const fiveStar = (kind: "character" | "weapon"): Unit[] =>
    (kind === "character" ? catalog?.characters : catalog?.weapons)?.filter((u) => u.rarity === 5).map((u) => ({ id: u.id, name: u.name, icon: u.icon, kind })) ?? [];
  const unitsFor = (key: string) =>
    [...(key !== "weapon" ? fiveStar("character") : []), ...(key !== "character" ? fiveStar("weapon") : [])].sort((a, b) => a.name.localeCompare(b.name));
  const unitOf = (catalogId: string | null): Unit | undefined => {
    if (!catalogId || !index) return undefined;
    const c = index.characters.get(catalogId);
    if (c) return { id: c.id, name: c.name, icon: c.icon, kind: "character" };
    const w = index.weapons.get(catalogId);
    return w ? { id: w.id, name: w.name, icon: w.icon, kind: "weapon" } : undefined;
  };

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={instance.id} active="pulls" gameKey={instance.gameKey} hasCatalog={Boolean(catalog)} />
      </div>
      {log.banners.length === 0 ? (
        <div className="card empty">This game has no pity rules yet.</div>
      ) : (
        <div className="pull-grid">
          {log.banners.map((b) => (
            <PullBanner
              key={b.key}
              b={b}
              gameKey={instance.gameKey}
              units={unitsFor(b.key)}
              unitOf={unitOf}
              onAdd={(body) => add.mutate(body)}
              onCalibrate={(body) => calibrate.mutate(body)}
              onUndo={(entryId) => undo.mutate(entryId)}
            />
          ))}
        </div>
      )}
      <p className="small muted" style={{ marginTop: 10 }}>
        Log pulls as you do them: +10 for a ten-pull without a 5★, "Log a 5★" when one drops. Starting mid-pity? Use "Set pity" once.
      </p>
    </>
  );
}
