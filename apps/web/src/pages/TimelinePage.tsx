import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { BannerDto, EventDto, OwnershipDto } from "@gacha/shared";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { formatDate, formatRemaining } from "../lib/time";
import type { InstanceListItem } from "../lib/types";

type Filter = "current" | "active" | "upcoming" | "ended" | "all";

function StatusBadge({ status }: { status: BannerDto["status"] }) {
  const cls = status === "active" ? "badge done" : status === "upcoming" ? "badge todo" : "badge";
  return <span className={cls}>{status}</span>;
}

function When({ item }: { item: { status: BannerDto["status"]; startsAt: string; endsAt: string } }) {
  if (item.status === "upcoming") return <span className="small muted">starts in {formatRemaining(item.startsAt)} · {formatDate(item.startsAt)}</span>;
  if (item.status === "active") return <span className="small muted">ends in {formatRemaining(item.endsAt)} · {formatDate(item.endsAt)}</span>;
  return <span className="small muted">ended {formatDate(item.endsAt)}</span>;
}

/** Banners and events for your games, with countdowns and ownership badges. */
export function TimelinePage() {
  const [filter, setFilter] = useState<Filter>("current");
  const [picked, setPicked] = useState<string | null>(null);

  const { data: instances } = useQuery({
    queryKey: ["instances"],
    queryFn: () => api.get<InstanceListItem[]>("/api/instances"),
  });
  const instance = useMemo(
    () => (instances ?? []).find((i) => i.gameKey === picked) ?? instances?.[0] ?? null,
    [instances, picked],
  );
  const gameKey = instance?.gameKey;

  const { data: banners } = useQuery({
    queryKey: ["banners", gameKey, filter],
    queryFn: () => api.get<BannerDto[]>(`/api/games/${gameKey}/banners?status=${filter}`),
    enabled: Boolean(gameKey),
  });
  const { data: events } = useQuery({
    queryKey: ["events", gameKey, filter],
    queryFn: () => api.get<EventDto[]>(`/api/games/${gameKey}/events?status=${filter}`),
    enabled: Boolean(gameKey),
  });
  const { data: owned } = useQuery({
    queryKey: ["ownership", instance?.id],
    queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${instance!.id}/ownership`),
    enabled: Boolean(instance),
  });
  const { index } = useCatalog(gameKey);
  const ownedSet = useMemo(() => new Set((owned ?? []).map((o) => `${o.kind}:${o.catalogId}`)), [owned]);

  if (!instances) return <div className="muted">Loading…</div>;
  if (instances.length === 0) {
    return (
      <div className="card empty">
        <p>Install a game first to see its banners and events.</p>
        <Link className="btn primary" to="/library">Browse games</Link>
      </div>
    );
  }

  const nameOf = (kind: "character" | "weapon", id: string) =>
    (kind === "character" ? index?.characters.get(id)?.name : index?.weapons.get(id)?.name) ?? id;

  return (
    <>
      <div className="page-head">
        <h1>Banners &amp; events</h1>
        <div className="row">
          {instances.map((i) => (
            <button key={i.id} className={`btn sm ${i.gameKey === gameKey ? "primary" : ""}`} onClick={() => setPicked(i.gameKey)}>
              {i.name}
            </button>
          ))}
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} style={{ width: "auto" }}>
            <option value="current">Active + upcoming</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="stack">
          <h2>Banners</h2>
          {(banners ?? []).length === 0 && <div className="card empty">No banners for this filter.</div>}
          {(banners ?? []).map((b) => (
            <div className="card" key={b.id}>
              <div className="spread">
                <div>
                  <strong>{b.name}</strong> <span className="badge">{b.kind}</span>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div style={{ marginTop: 4 }}><When item={b} /></div>
              {b.featured.length > 0 && (
                <div className="row" style={{ marginTop: 10 }}>
                  {b.featured.map((f) => {
                    const isOwned = ownedSet.has(`${f.kind}:${f.catalogId}`);
                    return (
                      <Link
                        key={`${f.kind}:${f.catalogId}`}
                        to={`/games/${instance!.id}/ownership`}
                        className={`badge ${isOwned ? "done" : ""}`}
                        title={isOwned ? "Owned" : "Not owned"}
                      >
                        {f.rateUp ? "★ " : ""}{nameOf(f.kind, f.catalogId)} {isOwned ? "✓" : "·"}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="stack">
          <h2>Events</h2>
          {(events ?? []).length === 0 && <div className="card empty">No events for this filter.</div>}
          {(events ?? []).map((e) => (
            <div className="card" key={e.id}>
              <div className="spread">
                <strong>{e.url ? <a href={e.url} target="_blank" rel="noreferrer">{e.name} ↗</a> : e.name}</strong>
                <StatusBadge status={e.status} />
              </div>
              <div style={{ marginTop: 4 }}><When item={e} /></div>
              {e.description && <p className="small" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{e.description}</p>}
              {Array.isArray(e.rewards) && e.rewards.length > 0 && (
                <div className="row" style={{ marginTop: 8 }}>
                  {(e.rewards as { label: string; qty?: number }[]).map((r, i) => (
                    <span className="badge" key={i}>{r.label}{r.qty ? ` ×${r.qty}` : ""}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
