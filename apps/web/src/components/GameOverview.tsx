import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, type Catalog, type OwnershipDto } from "@gacha/shared";
import { api } from "../lib/api";
import { formatRemaining } from "../lib/time";
import { assetUrl, communityAssetUrl, type AssetKind } from "../lib/assets";
import { GameIcon } from "./GameIcon";
import type { DashboardData, InstanceDetail } from "../lib/types";

const WEEKDAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const UNITS_SHOWN = 8;
const DOMAINS_SHOWN = 6;

type Unit = { kind: "character" | "weapon"; id: string; name: string; icon?: string; built: boolean };

/** ISO weekday of the "game day" — rotating domains flip at the daily reset. */
function gameWeekday(region: { utcOffsetMinutes: number; dailyResetHour: number }, now: number): number {
  return new Date(now + (region.utcOffsetMinutes - region.dailyResetHour * 60) * 60_000).getUTCDay() || 7;
}

const built = (d: { units: Unit[] }) => d.units.filter((u) => u.built).length;

/** Rotating domains open today, each with the owned units that level from it (built ones first). */
function domainsToday(catalog: Catalog, owned: OwnershipDto[], builtIds: Set<string>, weekday: number) {
  const usedBy = new Map<string, Unit[]>();
  const add = (materialIds: string[], u: Unit) => {
    for (const m of new Set(materialIds)) usedBy.set(m, [...(usedBy.get(m) ?? []), u]);
  };
  const ownedSet = new Set(owned.map((o) => `${o.kind}:${o.catalogId}`));
  for (const c of catalog.characters) {
    if (!ownedSet.has(`character:${c.id}`)) continue;
    const steps = [...c.talents.costs, ...Object.values(c.talents.costsByKey ?? {}).flat()];
    add(steps.flatMap((s) => s.materials.map((m) => m.materialId)), { kind: "character", id: c.id, name: c.name, icon: c.icon, built: builtIds.has(c.id) });
  }
  for (const w of catalog.weapons) {
    if (!ownedSet.has(`weapon:${w.id}`)) continue;
    add(w.ascension.flatMap((s) => s.materials.map((m) => m.materialId)), { kind: "weapon", id: w.id, name: w.name, icon: w.icon, built: false });
  }

  const domains = new Map<string, { source: string; top: Catalog["materials"][number]; units: Map<string, Unit> }>();
  for (const m of catalog.materials) {
    if (!m.source || !m.availability?.includes(weekday) || m.availability.length >= 7) continue;
    const d = domains.get(m.source) ?? { source: m.source, top: m, units: new Map() };
    if ((m.rarity ?? 0) > (d.top.rarity ?? 0)) d.top = m;
    for (const u of usedBy.get(m.id) ?? []) d.units.set(`${u.kind}:${u.id}`, u);
    domains.set(m.source, d);
  }
  return [...domains.values()]
    .map((d) => ({ ...d, units: [...d.units.values()].sort((a, b) => Number(b.built) - Number(a.built) || a.name.localeCompare(b.name)) }))
    .filter((d) => d.units.length > 0)
    .sort((a, b) => built(b) - built(a) || b.units.length - a.units.length);
}

function Icon({ gameKey, kind, icon, name, className }: { gameKey: string; kind: AssetKind; icon?: string; name: string; className: string }) {
  return <GameIcon src={assetUrl(gameKey, kind, icon)} fallback={communityAssetUrl(gameKey, kind, icon)} alt={name} className={className} />;
}

/** "What's going on in <game>": live banners/events, to-dos, and today's domains. */
export function GameOverview({ instance, catalog, owned }: { instance: InstanceDetail; catalog: Catalog | null; owned: OwnershipDto[] }) {
  const qc = useQueryClient();
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const toggleDaily = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => api.post(`/api/tasks/${v.id}/complete`, { done: v.done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  const game = getGame(instance.gameKey);
  const region = game?.regions.find((r) => r.key === instance.regionKey) ?? game?.regions[0];
  const [now] = useState(() => Date.now());
  const [allDomains, setAllDomains] = useState(false);
  const weekday = region ? gameWeekday(region, now) : 1;
  const builtIds = useMemo(() => new Set(instance.characters.map((c) => c.catalogId).filter((x): x is string => Boolean(x))), [instance.characters]);
  const domains = useMemo(
    () => (catalog ? domainsToday(catalog, owned, builtIds, weekday) : []),
    [catalog, owned, builtIds, weekday],
  );

  if (!dash) return null;
  const g = dash.games.find((x) => x.instanceId === instance.id);
  const banners = dash.timeline.banners.filter((b) => b.gameKey === instance.gameKey && b.status === "active");
  const events = dash.timeline.events
    .filter((e) => e.gameKey === instance.gameKey && e.status === "active")
    .sort((a, b) => a.endsAt.localeCompare(b.endsAt));
  const buildIds = new Set(instance.characters.map((c) => c.id));
  const goals = dash.goals.filter((t) => t.refId === instance.id || buildIds.has(t.refId ?? ""));
  const hasDomains = Boolean(catalog?.materials.some((m) => m.availability?.length));

  return (
    <div className="ov-grid">
      <div className="card">
        <div className="spread">
          <h3 style={{ margin: 0 }}>Happening now</h3>
          <Link className="small" to="/timeline">Calendar →</Link>
        </div>
        {banners.length === 0 && events.length === 0 && <p className="small">No banners or events running.</p>}
        {banners.map((b) => (
          <div className="ov-banner" key={b.id}>
            <div className="ov-feat">
              {b.featured.filter((f) => (f.rarity ?? 0) >= 5).map((f) => (
                <span key={f.catalogId} className={`ov-unit ${f.owned ? "owned" : ""}`} title={`${f.name ?? f.catalogId}${f.owned ? " · owned" : ""}`}>
                  <Icon gameKey={instance.gameKey} kind={f.kind} icon={f.icon} name={f.name ?? f.catalogId} className="ov-unit-art r5" />
                </span>
              ))}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="ov-title">{b.name}</div>
              <div className="small muted">{b.kind} banner · ends in {formatRemaining(b.endsAt)}</div>
            </div>
          </div>
        ))}
        {events.length > 0 && (
          <div className="ov-events">
            {events.slice(0, 8).map((e) => (
              <div className="spread small" key={e.id}>
                <span className="ov-ellipsis">{e.name}</span>
                <span className="muted" style={{ whiteSpace: "nowrap" }}>{formatRemaining(e.endsAt)}</span>
              </div>
            ))}
            {events.length > 8 && <Link className="small" to="/timeline">+{events.length - 8} more</Link>}
          </div>
        )}
      </div>

      <div className="card">
        <h3>To-do</h3>
        {g && g.dailies.length > 0 && (
          <div className="chips">
            {g.dailies.map((d) => (
              <button key={d.id} type="button" className={`chip-toggle ${d.doneThisCycle ? "on" : ""}`} onClick={() => toggleDaily.mutate({ id: d.id, done: !d.doneThisCycle })}>
                {d.doneThisCycle ? "✓ " : ""}{d.title}
              </button>
            ))}
          </div>
        )}
        {g?.nextReset && <p className="small muted" style={{ margin: "8px 0 0" }}>Reset in {formatRemaining(g.nextReset)}</p>}
        <div className="ov-goals">
          {goals.length === 0 && <p className="small">No goals. Set one from a character's Farming target.</p>}
          {goals.slice(0, 8).map((t) => {
            const m = dash.goalMaterials[t.id];
            return (
              <Link key={t.id} to={t.scope === "character" ? `/characters/${t.refId}` : "/"} className="ov-goal">
                <span className="ov-ellipsis">{t.title}</span>
                {m && (
                  <>
                    <div className="meter"><span style={{ width: `${(m.done / Math.max(1, m.total)) * 100}%` }} /></div>
                    <span className="small muted">{m.done}/{m.total}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {hasDomains && (
        <div className="card">
          <h3>Domains today <span className="small muted">· {WEEKDAY[weekday]}{weekday === 7 ? ", all open" : ""}</span></h3>
          {domains.length === 0 && <p className="small">Nothing you own levels from today's domains. Mark what you own in Ownership.</p>}
          <div className="stack" style={{ gap: 10 }}>
            {(allDomains ? domains : domains.slice(0, DOMAINS_SHOWN)).map((d) => (
              <div className="ov-domain" key={d.source}>
                <Icon gameKey={instance.gameKey} kind="material" icon={d.top.icon} name={d.top.name} className="ov-mat" />
                <div style={{ minWidth: 0 }}>
                  <div className="ov-title">{d.source.replace(/^Domain of \w+: /, "")}</div>
                  <div className="small muted ov-ellipsis">{d.top.name.replace(/^(Philosophies|Guide|Teachings) of /, "").trim()} · {d.top.category.replace(/ Material$/, "").toLowerCase()}</div>
                  <div className="ov-users">
                    {d.units.slice(0, UNITS_SHOWN).map((u) => (
                      <span key={`${u.kind}:${u.id}`} className={`ov-unit sm ${u.built ? "owned" : ""}`} title={`${u.name}${u.built ? " · has a build" : ""}`}>
                        <Icon gameKey={instance.gameKey} kind={u.kind} icon={u.icon} name={u.name} className="ov-unit-art" />
                      </span>
                    ))}
                    {d.units.length > UNITS_SHOWN && <span className="small muted">+{d.units.length - UNITS_SHOWN}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {domains.length > DOMAINS_SHOWN && (
            <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={() => setAllDomains(!allDomains)}>
              {allDomains ? "Show fewer" : `Show all ${domains.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
