import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import {
  cadenceWindow,
  getGame,
  rosterTag,
  type BannerDto,
  type EventDto,
  type GameRegion,
  type RewardDto,
  type TimelineDto,
  type WishlistItemDto,
} from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import type { DashboardData } from "../lib/types";
import { Segmented } from "../components/ui";
import { CalendarSelected } from "../components/calendar/CalendarSelected";
import { RosterRewards } from "../components/calendar/RosterRewards";

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WHEN = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const WEEKS = 6;

type Layer = "banners" | "events" | "versions" | "cycles" | "passes";
const LAYERS: { key: Layer; label: string; on: boolean }[] = [
  { key: "banners", label: "Banners", on: true },
  { key: "events", label: "Events", on: true },
  { key: "versions", label: "Versions", on: true },
  { key: "cycles", label: "Endgame cycles", on: false },
  { key: "passes", label: "Battle passes", on: false },
];

/** One bar: a banner phase, an event, an endgame cycle or a pass, in epoch ms. */
export type CalItem = {
  id: string;
  kind: "banner" | "event" | "cycle" | "pass";
  gameKey: string;
  instanceId: string;
  name: string;
  start: number;
  end: number;
  source: "feed" | "admin" | "game";
  tag?: string | null;
  banners?: BannerDto[];
  event?: EventDto;
  region: GameRegion;
};

/** Local midnight `n` calendar days after `t` (safe across daylight saving). */
const addDays = (t: number, n: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.getTime();
};
const mondayOf = (t: number) => addDays(t, -((new Date(t).getDay() + 6) % 7));
const sourceOf = (payload: unknown): "feed" | "admin" =>
  (payload as { source?: string } | null)?.source === "hoyoverse" ? "feed" : "admin";

/** Greedy lanes: each bar goes in the first lane free at its start. */
function lanes(items: CalItem[]): CalItem[][] {
  const out: CalItem[][] = [];
  for (const it of [...items].sort((a, b) => a.start - b.start)) {
    const lane = out.find((l) => l.at(-1)!.end <= it.start);
    if (lane) lane.push(it);
    else out.push([it]);
  }
  return out;
}

/**
 * Banners and events (WIREFRAMES.md A4): six weeks from this Monday, paged by
 * two weeks, a tick for every day and each bar's dates; one block per game
 * with its banner and event rows, layers for versions, endgame cycles and
 * passes; the selected item with its reward picker and links to its featured
 * characters; the rewards that update your roster. Timeline, Month (what
 * starts and ends each day; Georges, 2026-10-10) or List.
 */
export function CalendarPage() {
  const scope = useSearchParams()[0].get("game");
  const [now] = useState(() => Date.now());
  const [offset, setOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [view, setView] = useState<"timeline" | "month" | "list">("timeline");
  const [layers, setLayers] = useState(() => new Set(LAYERS.filter((l) => l.on).map((l) => l.key)));
  const [selected, setSelected] = useState<string | null>(null);
  const [onlyWished, setOnlyWished] = useState(false);
  // The month view shows six weeks from the Monday before the month's first day.
  const monthFirst = new Date(new Date(now).getFullYear(), new Date(now).getMonth() + monthOffset, 1).getTime();
  const start = view === "month" ? mondayOf(monthFirst) : addDays(mondayOf(now), offset);
  const end = addDays(start, WEEKS * 7);

  const dash = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  });
  const win = useQuery({
    queryKey: ["timeline", start, end],
    queryFn: () =>
      api.get<TimelineDto>(
        `/api/timeline?from=${new Date(start).toISOString()}&to=${new Date(end).toISOString()}`,
      ),
    placeholderData: keepPreviousData,
  });
  const rewards = useQuery({
    queryKey: ["rewards"],
    queryFn: () => api.get<RewardDto[]>("/api/rewards"),
  });
  const wishlists = useQueries({
    queries: (dash.data?.games ?? []).map((g) => ({
      queryKey: ["wishlist", g.instanceId],
      queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${g.instanceId}/wishlist`),
    })),
  });

  if (dash.isError || win.isError) return <LoadError what="The calendar" retry={() => Promise.all([dash.refetch(), win.refetch()])} />;
  if (!dash.data || !win.data) return <div className="mu">Loading…</div>;
  if (dash.data.games.length === 0) {
    return (
      <div className="card">
        <p>Add a game first to see its banners and events.</p>
        <Link className="btn primary" to="/library">
          Browse games
        </Link>
      </div>
    );
  }

  const pct = (t: number) => ((Math.min(Math.max(t, start), end) - start) / (end - start)) * 100;
  const inWindow = (i: CalItem) => i.end > start && i.start < end;
  const myRewards = (rewards.data ?? []).filter((r) => !scope || r.gameKey === scope);

  const blocks = dash.data.games
    .filter((g) => !g.sleeping && (!scope || g.gameKey === scope))
    .flatMap((g) => {
      const game = getGame(g.gameKey);
      if (!game) return [];
      const region = game.regions.find((r) => r.key === g.regionKey) ?? game.regions[0]!;
      const base = { gameKey: g.gameKey, instanceId: g.instanceId, region };
      const m = game.manifest;
      // "Only what I wishlisted": banners featuring a wished unit, events whose rewards name one.
      const wished = new Set(
        (wishlists[dash.data.games.indexOf(g)]?.data ?? []).map((w) => w.catalogId),
      );
      const keep = (i: CalItem) =>
        !onlyWished ||
        Boolean(i.event && wished.has(i.event.key)) ||
        Boolean(i.banners?.some((b) => wished.has(b.key))) ||
        Boolean(i.banners?.some((b) => b.featured.some((f) => wished.has(f.catalogId)))) ||
        [...JSON.stringify(i.event?.effects ?? []).matchAll(/"catalogId":"([^"]+)"/g)].some((x) =>
          wished.has(x[1]!),
        );

      // Banners sharing a period are one phase: "Vodyanitsa +2".
      const phases = new Map<string, BannerDto[]>();
      for (const b of win.data.banners.filter((x) => x.gameKey === g.gameKey))
        phases.set(`${b.startsAt}|${b.endsAt}`, [
          ...(phases.get(`${b.startsAt}|${b.endsAt}`) ?? []),
          b,
        ]);
      const banners: CalItem[] = [...phases.values()].map((bs) => ({
        ...base,
        id: `b:${bs[0]!.id}`,
        kind: "banner",
        name: bs.length > 1 ? `${bs[0]!.name} +${bs.length - 1}` : bs[0]!.name,
        start: Date.parse(bs[0]!.startsAt),
        end: Date.parse(bs[0]!.endsAt),
        source: sourceOf(bs[0]!.payload),
        banners: bs,
      }));
      const events: CalItem[] = win.data.events
        .filter((e) => e.gameKey === g.gameKey)
        .map((e) => ({
          ...base,
          id: `e:${e.id}`,
          kind: "event",
          name: e.name,
          start: Date.parse(e.startsAt),
          end: Date.parse(e.endsAt),
          source: sourceOf(e.payload),
          tag: rosterTag(e.effects ?? [], game),
          event: e,
        }));
      const cycles: CalItem[] = m.endgame.flatMap((mode) => {
        const out: CalItem[] = [];
        let w = cadenceWindow(mode.anchor, region, new Date(start));
        for (
          let i = 0;
          i < 24 && w.start.getTime() < end;
          i++, w = cadenceWindow(mode.anchor, region, w.end)
        ) {
          const close = mode.openDays
            ? w.start.getTime() + mode.openDays * 86_400_000
            : w.end.getTime();
          out.push({
            ...base,
            id: `c:${g.gameKey}:${mode.key}:${w.start.getTime()}`,
            kind: "cycle",
            name: mode.name,
            start: w.start.getTime(),
            end: close,
            source: "game",
          });
        }
        return out;
      });
      const version = cadenceWindow(
        { cadence: "version", start: m.version.start, days: m.version.days },
        region,
        new Date(now),
      );
      const passes: CalItem[] = [
        ...(m.battlePass
          ? [
              {
                ...base,
                id: `p:${g.gameKey}:battle`,
                kind: "pass" as const,
                name: `${m.battlePass.name}${g.passes.battle ? ` · Lv ${g.passes.battle.level}` : ""}`,
                start: version.start.getTime(),
                end: version.end.getTime(),
                source: "game" as const,
              },
            ]
          : []),
        ...(g.passes.monthly
          ? [
              {
                ...base,
                id: `p:${g.gameKey}:monthly`,
                kind: "pass" as const,
                name: m.monthlyPass?.name ?? "30-day pass",
                start: now,
                end: Date.parse(g.passes.monthly.endsAt),
                source: "game" as const,
              },
            ]
          : []),
      ];

      const rows: { name?: string; items: CalItem[] }[] = [
        ...(layers.has("banners")
          ? lanes(banners.filter(inWindow).filter(keep)).map((items) => ({ items }))
          : []),
        ...(layers.has("events")
          ? lanes(events.filter(inWindow).filter(keep)).map((items) => ({ items }))
          : []),
        ...(layers.has("cycles")
          ? lanes(cycles.filter(inWindow)).map((items, i) => ({
              name: i === 0 ? "Endgame" : undefined,
              items,
            }))
          : []),
        ...(layers.has("passes")
          ? lanes(passes.filter(inWindow)).map((items, i) => ({
              name: i === 0 ? "Passes" : undefined,
              items,
            }))
          : []),
      ];
      const all = [...banners, ...events, ...cycles, ...passes];
      const tick =
        layers.has("versions") && version.end.getTime() > start && version.end.getTime() < end
          ? version.end.getTime()
          : null;
      return [
        {
          g,
          game,
          rows,
          all,
          tick,
          versionName: m.version.name,
          source: [...banners, ...events].some((i) => i.source === "feed") ? "feed" : "admin",
        },
      ];
    });

  const items = blocks.flatMap((b) => b.all.filter(inWindow));
  const visible = blocks.flatMap((b) => b.rows.flatMap((r) => r.items));
  const firstReward = myRewards[0] && `e:${myRewards[0].eventId}`;
  const current = items.find((i) => i.id === (selected ?? firstReward)) ?? null;
  const nowPct = pct(now);
  const showNow = now > start && now < end;

  return (
    <>
      <div className="cal-head">
        <h1>Banners and events</h1>
        <div className="row">
          <Segmented
            label="View"
            options={[
              { value: "timeline", label: "Timeline" },
              { value: "month", label: "Month" },
              { value: "list", label: "List" },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "month" ? (
            <>
              <button className="btn" onClick={() => setMonthOffset(monthOffset - 1)}>
                ‹ Month
              </button>
              <button className="btn" disabled={monthOffset === 0} onClick={() => setMonthOffset(0)}>
                This month
              </button>
              <button className="btn" onClick={() => setMonthOffset(monthOffset + 1)}>
                Month ›
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => setOffset(offset - 14)}>
                ‹ 2 weeks
              </button>
              <button className="btn" disabled={offset === 0} onClick={() => setOffset(0)}>
                Today
              </button>
              <button className="btn" onClick={() => setOffset(offset + 14)}>
                2 weeks ›
              </button>
            </>
          )}
        </div>
      </div>
      <div className="cal-layers">
        {LAYERS.map((l) => (
          <label key={l.key}>
            <input
              type="checkbox"
              checked={layers.has(l.key)}
              onChange={(e) =>
                setLayers((s) => {
                  const next = new Set(s);
                  if (e.target.checked) next.add(l.key);
                  else next.delete(l.key);
                  return next;
                })
              }
            />
            <i className={`cal-key is-${l.key}`} aria-hidden="true" />
            {l.label}
          </label>
        ))}
        <label>
          <input type="checkbox" checked={onlyWished} onChange={(e) => setOnlyWished(e.target.checked)} />
          Only what I wishlisted
        </label>
        <span className="cal-range mn mu">
          {DAY.format(start)} · {DAY.format(addDays(end, -1))} · your time ({ZONE})
        </span>
      </div>

      <div className="cal-page">
        <div className="cal-main">
          {view === "timeline" ? (
            <section className="graph cal-board" aria-label="Timeline">
              <div className="cal-scroll">
                <div className="cal-grid">
                  <div className="cal-r cal-wk">
                    <div className="cal-label mn mu">Week of</div>
                    <div className="cal-track">
                      {Array.from({ length: WEEKS }, (_, i) => (
                        <span key={i} style={{ left: `${(i / WEEKS) * 100}%` }}>
                          {DAY.format(addDays(start, i * 7))}
                        </span>
                      ))}
                      {showNow && (
                        <b className="cal-today" style={{ left: `${nowPct}%` }}>
                          Today
                        </b>
                      )}
                    </div>
                  </div>
                  {/* A tick for every day, weekends shaded, so a bar's first and last days read at a glance. */}
                  <div className="cal-r cal-days">
                    <div className="cal-label mn mu">Day</div>
                    <div className="cal-track">
                      {Array.from({ length: WEEKS * 7 }, (_, i) => {
                        const d = new Date(addDays(start, i));
                        return (
                          <span key={i} className={`cal-day ${i % 7 >= 5 ? "is-weekend" : ""} ${addDays(now, 0) === d.getTime() ? "is-today" : ""}`} style={{ left: `${(i / (WEEKS * 7)) * 100}%`, width: `${100 / (WEEKS * 7)}%` }}>
                            {d.getDate()}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {blocks.map((b) => (
                    <div className="cal-block" key={b.g.gameKey}>
                      {(b.rows.length ? b.rows : [{ items: [] as CalItem[] }]).map((row, i) => (
                        <div className="cal-r" key={i}>
                          <div className="cal-label">
                            {i === 0 && (
                              <>
                                <Link
                                  className="cal-game-name"
                                  to={`/games/${b.g.instanceId}`}
                                  style={{ ["--c" as string]: b.g.accent }}
                                >
                                  {b.g.name}
                                </Link>
                                <span className="mn mu cal-src">{/^\d/.test(b.versionName) ? `v${b.versionName}` : b.versionName}</span>
                              </>
                            )}
                            {row.name && <span className="cal-lane-name">{row.name}</span>}
                          </div>
                          <div className="cal-track">
                            {row.items.map((it) => (
                              <button
                                key={it.id}
                                type="button"
                                className={`cal-bar is-${it.kind} ${it.end < now ? "is-ended" : ""}`}
                                style={{
                                  left: `${pct(it.start)}%`,
                                  // A gap before the next bar, so one phase's end and the next's start stay apart.
                                  width: `calc(${pct(it.end) - pct(it.start)}% - 3px)`,
                                  ["--c" as string]: b.g.accent,
                                }}
                                aria-pressed={current?.id === it.id}
                                title={`${it.name}\n${WHEN.format(it.start)} → ${WHEN.format(it.end)}`}
                                onClick={() => setSelected(it.id)}
                              >
                                {it.tag && <b className="cal-tag">{it.tag}</b>}
                                <span className="cal-name">{it.name}</span>
                                <span className="cal-dates">
                                  {DAY.format(it.start)} → {DAY.format(it.end)}
                                </span>
                              </button>
                            ))}
                            {i === 0 && b.tick !== null && (
                              <span
                                className={`cal-vtick ${pct(b.tick) > 80 ? "is-left" : ""}`}
                                style={{ left: `${pct(b.tick)}%` }}
                              >
                                update · {DAY.format(b.tick)}
                              </span>
                            )}
                            {showNow && (
                              <i
                                className="cal-now"
                                style={{ left: `${nowPct}%` }}
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : view === "month" ? (
            <section className="card cal-month" aria-label="Month">
              <h3>{MONTH.format(monthFirst)}</h3>
              <div className="cal-mgrid">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="cal-mhead mn mu">
                    {w}
                  </span>
                ))}
                {Array.from({ length: WEEKS * 7 }, (_, i) => {
                  const from = addDays(start, i);
                  const to = addDays(start, i + 1);
                  const d = new Date(from);
                  const starts = visible.filter((it) => it.start >= from && it.start < to);
                  const ends = visible.filter((it) => it.end >= from && it.end < to);
                  const accent = (it: CalItem) => blocks.find((x) => x.g.gameKey === it.gameKey)?.g.accent;
                  return (
                    <div key={i} className={`cal-mday ${d.getMonth() === new Date(monthFirst).getMonth() ? "" : "is-other"} ${addDays(now, 0) === from ? "is-today" : ""}`}>
                      <span className="cal-mnum mn">{d.getDate()}</span>
                      {[...starts.map((it) => ["Starts", it] as const), ...ends.map((it) => ["Ends", it] as const)].map(([what, it]) => (
                        <button
                          key={`${what}:${it.id}`}
                          type="button"
                          className={`cal-mitem is-${what.toLowerCase()} is-${it.kind}`}
                          style={{ ["--c" as string]: accent(it) }}
                          aria-label={`${what}: ${it.name}`}
                          aria-pressed={current?.id === it.id}
                          title={`${it.name}\n${WHEN.format(it.start)} → ${WHEN.format(it.end)}`}
                          onClick={() => setSelected(it.id)}
                        >
                          <span aria-hidden="true">{what === "Starts" ? "▶" : "■"}</span> {it.name}
                          {what === "Ends" && <span className="mu"> · {TIME.format(it.end)}</span>}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
              <p className="cal-foot mu">▶ starts · ■ ends</p>
            </section>
          ) : (
            <section className="card cal-list" aria-label="List">
              {visible.length === 0 ? (
                <p className="mu">Nothing in these six weeks.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Name</th>
                      <th>Kind</th>
                      <th>Starts</th>
                      <th>Ends</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...visible]
                      .sort((a, z) => a.start - z.start)
                      .map((it) => (
                        <tr key={it.id}>
                          <td className="mn">{getGame(it.gameKey)?.shortName ?? it.gameKey}</td>
                          <td>
                            {it.tag && <b className="cal-tag">{it.tag}</b>}{" "}
                            <button type="button" onClick={() => setSelected(it.id)}>
                              {it.name}
                            </button>
                          </td>
                          <td className="mn mu">{it.kind}</td>
                          <td className="mn">{DAY.format(it.start)}</td>
                          <td className="mn">{DAY.format(it.end)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </section>
          )}
          <RosterRewards rewards={myRewards} onPick={(eventId) => setSelected(`e:${eventId}`)} />
        </div>
        <CalendarSelected
          key={current?.id ?? "none"}
          item={current}
          reward={myRewards.find((r) => current?.id === `e:${r.eventId}`)}
          now={now}
          onClose={() => setSelected("none")}
        />
      </div>
    </>
  );
}
