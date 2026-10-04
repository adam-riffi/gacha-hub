import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatDate, formatRemaining } from "../lib/time";
import { assetUrl, communityAssetUrl } from "../lib/assets";
import { GameIcon } from "../components/GameIcon";
import type { DashboardData } from "../lib/types";

const DAYS = 42;
const DAY = 86_400_000;
const MONTH = new Intl.DateTimeFormat(undefined, { month: "short" });

type Banner = DashboardData["timeline"]["banners"][number];
type Row = { id: string; name: string; startsAt: string; endsAt: string; status: string; banner?: Banner };

/** Banners and events as bars on a six-week calendar, one block per game. */
export function TimelinePage() {
  const [offset, setOffset] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [now] = useState(() => Date.now());
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });

  if (!dash) return <div className="muted">Loading…</div>;
  if (dash.games.length === 0) {
    return (
      <div className="card empty">
        <p>Add a game first to see its banners and events.</p>
        <Link className="btn primary" to="/library">Browse games</Link>
      </div>
    );
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = today.getTime() + (offset - 3) * DAY;
  const end = start + DAYS * DAY;
  const pct = (t: number) => ((Math.min(Math.max(t, start), end) - start) / (end - start)) * 100;
  const days = Array.from({ length: DAYS }, (_, i) => new Date(start + i * DAY));
  const nowPct = pct(now);
  const inWindow = (r: Row) => new Date(r.endsAt).getTime() > start && new Date(r.startsAt).getTime() < end;

  const games = dash.games.filter((g) => !g.sleeping);
  const blocks = games
    .filter((g) => !hidden.has(g.gameKey))
    .map((g) => {
      const banners: Row[] = dash.timeline.banners.filter((b) => b.gameKey === g.gameKey).map((b) => ({ ...b, id: `b:${b.id}`, banner: b }));
      const events: Row[] = dash.timeline.events.filter((e) => e.gameKey === g.gameKey).map((e) => ({ ...e, id: `e:${e.id}` }));
      const byEnd = (a: Row, b: Row) => a.endsAt.localeCompare(b.endsAt);
      return { g, rows: [...banners.sort(byEnd), ...events.sort(byEnd)].filter(inWindow) };
    });

  const toggle = (key: string) =>
    setHidden((h) => {
      const next = new Set(h);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <>
      <div className="page-head">
        <h1>Banners &amp; events</h1>
        <div className="row">
          {games.map((g) => (
            <button key={g.gameKey} className={`btn sm ${hidden.has(g.gameKey) ? "ghost" : ""}`} style={{ borderLeft: `3px solid ${g.accent}` }} onClick={() => toggle(g.gameKey)}>
              {g.name}
            </button>
          ))}
          <span style={{ width: 12 }} />
          <button className="btn sm" disabled={offset === 0} onClick={() => setOffset(offset - 14)}>‹ 2 weeks</button>
          <button className="btn sm" disabled={offset === 0} onClick={() => setOffset(0)}>Today</button>
          <button className="btn sm" onClick={() => setOffset(offset + 14)}>2 weeks ›</button>
        </div>
      </div>

      <div className="cal">
        <div className="cal-row cal-head">
          <div className="cal-label" />
          <div className="cal-track">
            {days.map((d, i) =>
              i === 0 || d.getDate() === 1 ? (
                <span key={i} className="cal-month" style={{ left: `${(i / DAYS) * 100}%` }}>{MONTH.format(d)}</span>
              ) : null,
            )}
            <div className="cal-days">
              {days.map((d, i) => (
                <span key={i} className={`${d.getTime() === today.getTime() ? "is-today" : ""} ${d.getDay() % 6 === 0 ? "is-weekend" : ""}`}>{d.getDate()}</span>
              ))}
            </div>
          </div>
        </div>

        {blocks.map(({ g, rows }) => (
          <div className="cal-game" key={g.gameKey}>
            <div className="cal-game-name" style={{ borderLeftColor: g.accent }}>
              <Link to={`/games/${g.instanceId}`}>{g.name}</Link>
              {rows.length === 0 && <span className="small muted"> · nothing in these weeks</span>}
            </div>
            {rows.map((r) => {
              const s = new Date(r.startsAt).getTime();
              const e = new Date(r.endsAt).getTime();
              const featured = [...(r.banner?.featured ?? [])].filter((f) => (f.rarity ?? 0) >= 5);
              return (
                <div className="cal-row" key={r.id} title={`${r.name}\n${formatDate(r.startsAt)} → ${formatDate(r.endsAt)}`}>
                  <div className="cal-label">
                    {featured.map((f) => (
                      <GameIcon
                        key={f.catalogId}
                        src={assetUrl(g.gameKey, f.kind, f.icon)}
                        fallback={communityAssetUrl(g.gameKey, f.kind, f.icon)}
                        alt={f.name ?? f.catalogId}
                        className={`cal-feat ${f.owned ? "owned" : ""}`}
                      />
                    ))}
                    <span className="cal-name">{r.name}</span>
                  </div>
                  <div className="cal-track">
                    <div
                      className={`cal-bar ${r.banner ? "is-banner" : ""} ${s < start ? "cut-l" : ""} ${e > end ? "cut-r" : ""}`}
                      style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%`, ["--c" as string]: g.accent }}
                    >
                      {r.status === "upcoming" ? `starts in ${formatRemaining(r.startsAt)}` : `ends in ${formatRemaining(r.endsAt)}`}
                    </div>
                    {nowPct > 0 && nowPct < 100 && <div className="cal-now" style={{ left: `${nowPct}%` }} />}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        Genshin banners and events update hourly from the official in-game notices. Hover a row for exact dates; ringed portraits are units you own.
      </p>
    </>
  );
}
