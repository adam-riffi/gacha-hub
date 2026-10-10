import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, pullForecast, pullsFor, type DashboardDto, type PassesDto, type PullLogDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { GameTabs } from "../components/GameTabs";
import { BannerCard, type AddBody, type CalibrateBody, type Unit } from "../components/pulls/BannerCard";
import type { InstanceDetail } from "../lib/types";

const NUM = new Intl.NumberFormat("en-GB");
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const DATE = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * A game's Pulls tab (WIREFRAMES.md G3): the pulls you have and the ones
 * coming by the end of the version; each event banner with its status, pity,
 * odds and curve; the other banners in short; every 5★ you logged.
 */
export function PullsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const log = useQuery({ queryKey: ["pulls", id], queryFn: () => api.get<PullLogDto>(`/api/instances/${id}/pulls`) });
  const passes = useQuery({ queryKey: ["passes", id], queryFn: () => api.get<PassesDto>(`/api/instances/${id}/passes`) });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardDto>("/api/dashboard") });
  const { catalog } = useCatalog(instance.data?.gameKey);
  const refresh = () => Promise.all(["pulls", "dashboard"].map((k) => qc.invalidateQueries({ queryKey: k === "pulls" ? ["pulls", id] : [k] })));
  const failed = () => toast("Couldn't save the pulls", "err");
  const add = useMutation({ mutationFn: (body: AddBody) => api.post(`/api/instances/${id}/pulls`, body), onSuccess: refresh, onError: failed });
  const calibrate = useMutation({ mutationFn: (body: CalibrateBody) => api.post(`/api/instances/${id}/pulls/calibrate`, body), onSuccess: refresh, onError: failed });
  const undo = useMutation({ mutationFn: (entryId: string) => api.del(`/api/instances/${id}/pulls/${entryId}`), onSuccess: refresh });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || log.isError) {
    return (
      <div className="card" role="alert">
        <p>Pulls could not load.</p>
        <button className="btn" onClick={() => void Promise.all([instance.refetch(), log.refetch()])}>Try again</button>
      </div>
    );
  }
  if (!instance.data || !log.data || !game) return <div className="mu">Loading…</div>;

  const values = new Map(instance.data.currencies.map((c) => [c.key, c.value]));
  const pullCurrencies = game.currencies.filter((c) => c.pullCost).map((c) => ({ ...c, value: values.get(c.key) ?? 0 }));
  const have = pullsFor(pullCurrencies);
  const region = game.regions.find((r) => r.key === instance.data.regionKey) ?? game.regions[0]!;
  const passEnds = passes.data?.monthly ? new Date(passes.data.monthly.endsAt) : null;
  const forecast = pullForecast(game, region, new Date(), passEnds);
  const units: Unit[] = [
    ...(catalog?.characters ?? []).filter((c) => c.rarity >= 5).map((c) => ({ id: c.id, name: c.name, icon: c.icon, kind: "character" as const })),
    ...(catalog?.weapons ?? []).filter((w) => w.rarity >= 5).map((w) => ({ id: w.id, name: w.name, icon: w.icon, kind: "weapon" as const })),
  ];
  const byId = new Map(units.map((u) => [u.id, u]));
  const unitOf = (cid: string | null) => (cid ? byId.get(cid) : undefined);
  const live = (dash.data?.timeline.banners ?? []).filter((b) => b.gameKey === game.key && b.status === "active");
  const event = log.data.banners.filter((b) => b.featuredRate < 1);
  const rest = log.data.banners.filter((b) => b.featuredRate >= 1);
  const card = (b: (typeof event)[number], compact: boolean) => (
    <BannerCard
      key={b.key}
      b={b}
      gameKey={game.key}
      available={b.key === "standard" ? have.standard : have.limited}
      live={live.find((l) => l.kind === b.key)}
      units={units}
      unitOf={unitOf}
      compact={compact}
      onAdd={(body) => add.mutate(body)}
      onCalibrate={(body) => calibrate.mutate(body)}
      onUndo={(entryId) => undo.mutate(entryId)}
    />
  );
  const drops = log.data.banners
    .flatMap((b) => b.fiveStars.map((d) => ({ ...d, banner: b })))
    .sort((a, z) => z.at.localeCompare(a.at));
  const contested = drops.filter((d) => d.banner.featuredRate < 1 && d.featured !== null);

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={instance.data.id} active="pulls" gameKey={game.key} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <div className="pl-top">
        <section className="card" aria-label="Pulls available">
          <div className="spread">
            <h3>Pulls available</h3>
            <span className="tag">Manual</span>
          </div>
          <div className="kpi-value">
            {have.limited} <small>limited{have.standard ? ` · +${have.standard} standard` : ""}</small>
          </div>
          <table>
            <tbody>
              {pullCurrencies.map((c) => (
                <tr key={c.key}>
                  <td>{c.label}{c.standardOnly ? " (standard)" : ""}</td>
                  <td className="num">{NUM.format(c.value)}</td>
                  <td className="num mu">= {Math.floor(c.value / c.pullCost!)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card" aria-label={`By the end of ${game.manifest.version.name}`}>
          <div className="spread">
            <h3>By the end of {game.manifest.version.name}</h3>
            <span className="badge">forecast · {DAY.format(forecast.until)}</span>
          </div>
          <div className="kpi-value">
            +{forecast.pulls} <small>pulls → {have.limited + forecast.pulls} limited</small>
          </div>
          <table>
            <tbody>
              {forecast.lines.map((l) => (
                <tr key={l.key}>
                  <td>{l.label} · {l.days} days × {l.perDay}</td>
                  <td className="num">{NUM.format(l.total)}</td>
                </tr>
              ))}
              {forecast.lines.length === 0 && (
                <tr><td colSpan={2} className="mu">No daily income on record for this game yet.</td></tr>
              )}
              <tr><td className="mu">Events, endgame, codes</td><td className="num mu">not counted</td></tr>
            </tbody>
          </table>
        </section>
      </div>

      <div className="pl-label">
        <span className="kpi-label">Event banners</span>
        <span className="mn mu">Manual · pity and status from your log</span>
      </div>
      <div className="pl-banners">{event.map((b) => card(b, false))}</div>
      {rest.length > 0 && <div className="pl-banners">{rest.map((b) => card(b, true))}</div>}

      <section className="card pl-history" aria-label="History">
        <h3>History</h3>
        {drops.length === 0 ? (
          <p className="mu">No 5★ logged yet. Log one from a banner above; imports from the game come with F11.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr><th>Date</th><th>Banner</th><th>5★</th><th className="num">Pity</th><th>Result</th></tr>
              </thead>
              <tbody>
                {drops.slice(0, 20).map((d) => (
                  <tr key={d.id}>
                    <td className="mn">{DATE.format(new Date(d.at))}</td>
                    <td>{d.banner.label}</td>
                    <td>{unitOf(d.catalogId)?.name ?? "5★"}</td>
                    <td className="num">{d.pity}</td>
                    <td>{d.banner.featuredRate >= 1 ? <span className="badge">—</span> : d.featured === false ? <span className="badge todo">Lost</span> : d.featured ? <span className="badge done">Featured</span> : <span className="badge">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mn mu pl-note">
              average 5★ pity {Math.round(drops.reduce((t, d) => t + d.pity, 0) / drops.length)}
              {contested.length > 0 && ` · featured ${contested.filter((d) => d.featured).length} of ${contested.length}`}
            </p>
          </>
        )}
      </section>
    </>
  );
}
