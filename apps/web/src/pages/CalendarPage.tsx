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
  /** A banner featuring a unit you wish for, or an event you wished or whose rewards name one. */
  wished?: boolean;
  banners?: BannerDto[];
  event?: EventDto;
  region: GameRegion;
};

/** Local midnight `n` calendar days after `t` (safe across daylight saving). */
const addDays = (instant: number, days: number) => {
  const date = new Date(instant);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.getTime();
};
const mondayOf = (instant: number) => addDays(instant, -((new Date(instant).getDay() + 6) % 7));
const sourceOf = (payload: unknown): "feed" | "admin" =>
  (payload as { source?: string } | null)?.source === "hoyoverse" ? "feed" : "admin";

/** Greedy lanes: each bar goes in the first lane free at its start. */
function lanes(items: CalItem[]): CalItem[][] {
  const out: CalItem[][] = [];
  for (const item of [...items].sort((first, second) => first.start - second.start)) {
    const lane = out.find((candidate) => candidate.at(-1)!.end <= item.start);
    if (lane) lane.push(item);
    else out.push([item]);
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
  const [layers, setLayers] = useState(() => new Set(LAYERS.filter((layer) => layer.on).map((layer) => layer.key)));
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
    queries: (dash.data?.games ?? []).map((dashGame) => ({
      queryKey: ["wishlist", dashGame.instanceId],
      queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${dashGame.instanceId}/wishlist`),
    })),
  });

  if (dash.isError || win.isError) return <LoadError what="The calendar" retry={() => Promise.all([dash.refetch(), win.refetch()])} />;
  if (!dash.data || !win.data) return <div className="text-muted">Loading…</div>;
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

  const percentAt = (instant: number) => ((Math.min(Math.max(instant, start), end) - start) / (end - start)) * 100;
  const inWindow = (item: CalItem) => item.end > start && item.start < end;
  const myRewards = (rewards.data ?? []).filter((reward) => !scope || reward.gameKey === scope);

  const blocks = dash.data.games
    .filter((dashGame) => !dashGame.sleeping && (!scope || dashGame.gameKey === scope))
    .flatMap((dashGame) => {
      const game = getGame(dashGame.gameKey);
      if (!game) return [];
      const region = game.regions.find((candidate) => candidate.key === dashGame.regionKey) ?? game.regions[0]!;
      const base = { gameKey: dashGame.gameKey, instanceId: dashGame.instanceId, region };
      const manifest = game.manifest;
      // "Only what I wishlisted": banners featuring a wished unit, events whose rewards name one.
      const wished = new Set(
        (wishlists[dash.data.games.indexOf(dashGame)]?.data ?? []).map((wishedItem) => wishedItem.catalogId),
      );
      const isWished = (item: CalItem) =>
        Boolean(item.event && wished.has(item.event.key)) ||
        Boolean(item.banners?.some((banner) => wished.has(banner.key))) ||
        Boolean(item.banners?.some((banner) => banner.featured.some((featuredUnit) => wished.has(featuredUnit.catalogId)))) ||
        [...JSON.stringify(item.event?.effects ?? []).matchAll(/"catalogId":"([^"]+)"/g)].some((catalogMatch) =>
          wished.has(catalogMatch[1]!),
        );
      const keep = (item: CalItem) => !onlyWished || Boolean(item.wished);

      // Banners sharing a period are one phase: "Vodyanitsa +2".
      const phases = new Map<string, BannerDto[]>();
      for (const banner of win.data.banners.filter((candidate) => candidate.gameKey === dashGame.gameKey))
        phases.set(`${banner.startsAt}|${banner.endsAt}`, [
          ...(phases.get(`${banner.startsAt}|${banner.endsAt}`) ?? []),
          banner,
        ]);
      const banners: CalItem[] = [...phases.values()].map((phaseBanners): CalItem => ({
        ...base,
        id: `b:${phaseBanners[0]!.id}`,
        kind: "banner",
        name: phaseBanners.length > 1 ? `${phaseBanners[0]!.name} +${phaseBanners.length - 1}` : phaseBanners[0]!.name,
        start: Date.parse(phaseBanners[0]!.startsAt),
        end: Date.parse(phaseBanners[0]!.endsAt),
        source: sourceOf(phaseBanners[0]!.payload),
        banners: phaseBanners,
      })).map((item) => ({ ...item, wished: isWished(item) }));
      const events: CalItem[] = win.data.events
        .filter((event) => event.gameKey === dashGame.gameKey)
        .map((event): CalItem => ({
          ...base,
          id: `e:${event.id}`,
          kind: "event",
          name: event.name,
          start: Date.parse(event.startsAt),
          end: Date.parse(event.endsAt),
          source: sourceOf(event.payload),
          tag: rosterTag(event.effects ?? [], game),
          event: event,
        }))
        .map((item) => ({ ...item, wished: isWished(item) }));
      const cycles: CalItem[] = manifest.endgame.flatMap((mode) => {
        const out: CalItem[] = [];
        let cycleWindow = cadenceWindow(mode.anchor, region, new Date(start));
        for (
          let cycleIndex = 0;
          cycleIndex < 24 && cycleWindow.start.getTime() < end;
          cycleIndex++, cycleWindow = cadenceWindow(mode.anchor, region, cycleWindow.end)
        ) {
          const close = mode.openDays
            ? cycleWindow.start.getTime() + mode.openDays * 86_400_000
            : cycleWindow.end.getTime();
          out.push({
            ...base,
            id: `c:${dashGame.gameKey}:${mode.key}:${cycleWindow.start.getTime()}`,
            kind: "cycle",
            name: mode.name,
            start: cycleWindow.start.getTime(),
            end: close,
            source: "game",
          });
        }
        return out;
      });
      const version = cadenceWindow(
        { cadence: "version", start: manifest.version.start, days: manifest.version.days },
        region,
        new Date(now),
      );
      const passes: CalItem[] = [
        ...(manifest.battlePass
          ? [
              {
                ...base,
                id: `p:${dashGame.gameKey}:battle`,
                kind: "pass" as const,
                name: `${manifest.battlePass.name}${dashGame.passes.battle ? ` · Lv ${dashGame.passes.battle.level}` : ""}`,
                start: version.start.getTime(),
                end: version.end.getTime(),
                source: "game" as const,
              },
            ]
          : []),
        ...(dashGame.passes.monthly
          ? [
              {
                ...base,
                id: `p:${dashGame.gameKey}:monthly`,
                kind: "pass" as const,
                name: manifest.monthlyPass?.name ?? "30-day pass",
                start: now,
                end: Date.parse(dashGame.passes.monthly.endsAt),
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
          ? lanes(cycles.filter(inWindow)).map((items, laneIndex) => ({
              name: laneIndex === 0 ? "Endgame" : undefined,
              items,
            }))
          : []),
        ...(layers.has("passes")
          ? lanes(passes.filter(inWindow)).map((items, laneIndex) => ({
              name: laneIndex === 0 ? "Passes" : undefined,
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
          dashGame: dashGame,
          game,
          rows,
          all,
          tick,
          versionName: manifest.version.name,
          source: [...banners, ...events].some((item) => item.source === "feed") ? "feed" : "admin",
        },
      ];
    });

  const items = blocks.flatMap((block) => block.all.filter(inWindow));
  const visible = blocks.flatMap((block) => block.rows.flatMap((row) => row.items));
  const firstReward = myRewards[0] && `e:${myRewards[0].eventId}`;
  const current = items.find((item) => item.id === (selected ?? firstReward)) ?? null;
  const nowPct = percentAt(now);
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
      {/* One box per layer in its colour (round 7): banners in their games' colours, events edged in them, then endgames, passes, wishes. */}
      <div className="cal-layers" style={{ ["--games" as string]: `linear-gradient(90deg, ${blocks.map((block) => block.dashGame.accent).join(", ")})` }}>
        {LAYERS.map((layer) => (
          <label key={layer.key}>
            <input
              type="checkbox"
              className={`cal-check is-${layer.key}`}
              checked={layers.has(layer.key)}
              onChange={(event) =>
                setLayers((previousLayers) => {
                  const next = new Set(previousLayers);
                  if (event.target.checked) next.add(layer.key);
                  else next.delete(layer.key);
                  return next;
                })
              }
            />
            {layer.label}
          </label>
        ))}
        <label>
          <input type="checkbox" className="cal-check is-wished" checked={onlyWished} onChange={(event) => setOnlyWished(event.target.checked)} />
          Only what I wishlisted
        </label>
        <span className="cal-range font-mono text-muted">
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
                    <div className="cal-label font-mono text-muted">Week of</div>
                    <div className="cal-track">
                      {Array.from({ length: WEEKS }, (_, weekIndex) => (
                        <span key={weekIndex} style={{ left: `${(weekIndex / WEEKS) * 100}%` }}>
                          {DAY.format(addDays(start, weekIndex * 7))}
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
                    <div className="cal-label font-mono text-muted">Day</div>
                    <div className="cal-track">
                      {Array.from({ length: WEEKS * 7 }, (_, dayIndex) => {
                        const date = new Date(addDays(start, dayIndex));
                        return (
                          <span key={dayIndex} className={`cal-day ${dayIndex % 7 >= 5 ? "is-weekend" : ""} ${addDays(now, 0) === date.getTime() ? "is-today" : ""}`} style={{ left: `${(dayIndex / (WEEKS * 7)) * 100}%`, width: `${100 / (WEEKS * 7)}%` }}>
                            {date.getDate()}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {blocks.map((block) => (
                    <div className="cal-block" key={block.dashGame.gameKey}>
                      {(block.rows.length ? block.rows : [{ items: [] as CalItem[] }]).map((row, rowIndex) => (
                        <div className="cal-r" key={rowIndex}>
                          <div className="cal-label">
                            {rowIndex === 0 && (
                              <>
                                <Link
                                  className="cal-game-name"
                                  to={`/games/${block.dashGame.instanceId}`}
                                  style={{ ["--c" as string]: block.dashGame.accent }}
                                >
                                  {block.dashGame.name}
                                </Link>
                                <span className="font-mono text-muted cal-src">{/^\d/.test(block.versionName) ? `v${block.versionName}` : block.versionName}</span>
                              </>
                            )}
                            {row.name && <span className="cal-lane-name">{row.name}</span>}
                          </div>
                          <div className="cal-track">
                            {row.items.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className={`cal-bar is-${item.kind} ${item.wished ? "is-wished" : ""} ${item.end < now ? "is-ended" : ""}`}
                                style={{
                                  left: `${percentAt(item.start)}%`,
                                  // A gap before the next bar, so one phase's end and the next's start stay apart.
                                  width: `calc(${percentAt(item.end) - percentAt(item.start)}% - 3px)`,
                                  ["--c" as string]: block.dashGame.accent,
                                }}
                                aria-pressed={current?.id === item.id}
                                title={`${item.name}\n${WHEN.format(item.start)} → ${WHEN.format(item.end)}`}
                                onClick={() => setSelected(item.id)}
                              >
                                {item.wished && (
                                  <b className="cal-star" aria-label="Wishlisted" title="Wishlisted">
                                    ★
                                  </b>
                                )}
                                {item.tag && <b className="cal-tag">{item.tag}</b>}
                                <span className="cal-name">{item.name}</span>
                                <span className="cal-dates">
                                  {DAY.format(item.start)} → {DAY.format(item.end)}
                                </span>
                              </button>
                            ))}
                            {rowIndex === 0 && block.tick !== null && (
                              <span
                                className={`cal-vtick ${percentAt(block.tick) > 80 ? "is-left" : ""}`}
                                style={{ left: `${percentAt(block.tick)}%` }}
                              >
                                update · {DAY.format(block.tick)}
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
                {WEEKDAYS.map((weekday) => (
                  <span key={weekday} className="cal-mhead font-mono text-muted">
                    {weekday}
                  </span>
                ))}
                {Array.from({ length: WEEKS * 7 }, (_, dayIndex) => {
                  const from = addDays(start, dayIndex);
                  const to = addDays(start, dayIndex + 1);
                  const date = new Date(from);
                  const starts = visible.filter((item) => item.start >= from && item.start < to);
                  const ends = visible.filter((item) => item.end >= from && item.end < to);
                  const accent = (item: CalItem) => blocks.find((block) => block.dashGame.gameKey === item.gameKey)?.dashGame.accent;
                  return (
                    <div key={dayIndex} className={`cal-mday ${date.getMonth() === new Date(monthFirst).getMonth() ? "" : "is-other"} ${addDays(now, 0) === from ? "is-today" : ""}`}>
                      <span className="cal-mnum font-mono">{date.getDate()}</span>
                      {[...starts.map((startingItem) => ["Starts", startingItem] as const), ...ends.map((endingItem) => ["Ends", endingItem] as const)].map(([what, item]) => (
                        <button
                          key={`${what}:${item.id}`}
                          type="button"
                          className={`cal-mitem is-${what.toLowerCase()} is-${item.kind}`}
                          style={{ ["--c" as string]: accent(item) }}
                          aria-label={`${what}: ${item.name}`}
                          aria-pressed={current?.id === item.id}
                          title={`${item.name}\n${WHEN.format(item.start)} → ${WHEN.format(item.end)}`}
                          onClick={() => setSelected(item.id)}
                        >
                          <span aria-hidden="true">{what === "Starts" ? "▶" : "■"}</span> {item.name}
                          {what === "Ends" && <span className="text-muted"> · {TIME.format(item.end)}</span>}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
              <p className="cal-foot text-muted">▶ starts · ■ ends</p>
            </section>
          ) : (
            <section className="card cal-list" aria-label="List">
              {visible.length === 0 ? (
                <p className="text-muted">Nothing in these six weeks.</p>
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
                      .sort((first, second) => first.start - second.start)
                      .map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono">{getGame(item.gameKey)?.shortName ?? item.gameKey}</td>
                          <td>
                            {item.tag && <b className="cal-tag">{item.tag}</b>}{" "}
                            <button type="button" onClick={() => setSelected(item.id)}>
                              {item.name}
                            </button>
                          </td>
                          <td className="font-mono text-muted">{item.kind}</td>
                          <td className="font-mono">{DAY.format(item.start)}</td>
                          <td className="font-mono">{DAY.format(item.end)}</td>
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
          reward={myRewards.find((reward) => current?.id === `e:${reward.eventId}`)}
          now={now}
          onClose={() => setSelected("none")}
        />
      </div>
    </>
  );
}
