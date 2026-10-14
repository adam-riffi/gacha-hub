import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  currencyKind,
  featuredWithin,
  getGame,
  topStar,
  pullForecast,
  pullsFor,
  type DashboardDto,
  type PassesDto,
  type PullLogDto,
  type WishlistItemDto,
} from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useCatalog } from "../lib/catalog";
import { GameTabs } from "../components/GameTabs";
import {
  BannerCard,
  type AddBody,
  type CalibrateBody,
  type Unit,
} from "../components/pulls/BannerCard";
import { SavingsPlanner, percentText, type PlannerTarget } from "../components/pulls/SavingsPlanner";
import { TopUpCard } from "../components/pulls/TopUpCard";
import { TopUpHistory } from "../components/pulls/TopUpHistory";
import { CurrencyIcon } from "../components/CurrencyIcon";
import { UnitIcon } from "../components/CatalogIcon";
import { Glyph, bannerGlyph } from "../components/Glyph";
import { BannerHistory, PullHistory } from "../components/pulls/PullHistory";
import type { InstanceDetail } from "../lib/types";

const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/**
 * A game's Pulls tab (WIREFRAMES.md G3): the pulls you have and the ones
 * coming by the end of the version, with each target's chance now and by then;
 * each event banner with its status, pity, odds and curve; the other banners
 * in short; every 5★ you logged.
 */
export function PullsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  // A simulated top-up: an amount of one pull currency, added on top of what you have.
  const [topUp, setTopUp] = useState({ amount: 0, key: "" });
  const instance = useQuery({
    queryKey: ["instance", id],
    queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`),
  });
  const log = useQuery({
    queryKey: ["pulls", id],
    queryFn: () => api.get<PullLogDto>(`/api/instances/${id}/pulls`),
  });
  const passes = useQuery({
    queryKey: ["passes", id],
    queryFn: () => api.get<PassesDto>(`/api/instances/${id}/passes`),
  });
  const dash = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardDto>("/api/dashboard"),
  });
  const { catalog } = useCatalog(instance.data?.gameKey);
  const wishlist = useQuery({
    queryKey: ["wishlist", id],
    queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${id}/wishlist`),
  });
  const refresh = () =>
    Promise.all(
      ["pulls", "dashboard"].map((key) =>
        queryClient.invalidateQueries({ queryKey: key === "pulls" ? ["pulls", id] : [key] }),
      ),
    );
  const failed = () => toast("Couldn't save the pulls", "err");
  const add = useMutation({
    mutationFn: (body: AddBody) => api.post(`/api/instances/${id}/pulls`, body),
    onSuccess: refresh,
    onError: failed,
  });
  const calibrate = useMutation({
    mutationFn: (body: CalibrateBody) => api.post(`/api/instances/${id}/pulls/calibrate`, body),
    onSuccess: refresh,
    onError: failed,
  });
  const undo = useMutation({
    mutationFn: (entryId: string) => api.del(`/api/instances/${id}/pulls/${entryId}`),
    onSuccess: refresh,
  });
  const hide = useMutation({
    mutationFn: (hiddenBanners: string[]) => api.put(`/api/instances/${id}`, { hiddenBanners }),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ["instance", id] }), queryClient.invalidateQueries({ queryKey: ["dashboard"] })]),
    onError: () => toast("Couldn't save the hidden banners", "err"),
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || log.isError) return <LoadError what="Pulls" retry={() => Promise.all([instance.refetch(), log.refetch()])} />;
  if (!instance.data || !log.data || !game) return <div className="mu">Loading…</div>;

  const values = new Map(instance.data.currencies.map((currency) => [currency.key, currency.value]));
  const pullCurrencies = game.currencies
    .filter((currency) => currency.pullCost)
    .map((currency) => ({ ...currency, value: values.get(currency.key) ?? 0 }));
  const have = pullsFor(pullCurrencies);
  const topUpCurrency = pullCurrencies.find((pullCurrency) => pullCurrency.key === topUp.key) ?? pullCurrencies.find((pullCurrency) => !pullCurrency.standardOnly && !pullCurrency.onlyFor);
  const topped = pullsFor(pullCurrencies.map((pullCurrency) => (pullCurrency === topUpCurrency ? { ...pullCurrency, value: pullCurrency.value + topUp.amount } : pullCurrency)));
  const star = topStar(game.key);

  const region = game.regions.find((candidate) => candidate.key === instance.data.regionKey) ?? game.regions[0]!;
  const passEnds = passes.data?.monthly ? new Date(passes.data.monthly.endsAt) : null;
  const forecast = pullForecast(game, region, new Date(), passEnds);
  const units: Unit[] = [
    ...(catalog?.characters ?? [])
      .filter((character) => character.rarity >= 5)
      .map((character) => ({ id: character.id, name: character.name, icon: character.icon, kind: "character" as const })),
    ...(catalog?.weapons ?? [])
      .filter((weapon) => weapon.rarity >= 5)
      .map((weapon) => ({ id: weapon.id, name: weapon.name, icon: weapon.icon, kind: "weapon" as const })),
  ];
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const unitOf = (catalogId: string | null) => (catalogId ? byId.get(catalogId) : undefined);
  // Any unit of the catalog by id, for history rows and featured lists (4★ included).
  const nameOf = (catalogId: string | null): Unit | undefined => {
    if (!catalogId) return undefined;
    const character = catalog?.characters.find((candidate) => candidate.id === catalogId);
    const weapon = character ? undefined : catalog?.weapons.find((candidate) => candidate.id === catalogId);
    return byId.get(catalogId) ?? (character ? { id: character.id, name: character.name, icon: character.icon, kind: "character" } : weapon ? { id: weapon.id, name: weapon.name, icon: weapon.icon, kind: "weapon" } : undefined);
  };
  const live = (dash.data?.timeline.banners ?? []).filter(
    (banner) => banner.gameKey === game.key && banner.status === "active",
  );
  const hidden = instance.data.hiddenBanners ?? [];
  const shown = log.data.banners.filter((banner) => !hidden.includes(banner.key));
  const eventBanners = shown.filter((banner) => banner.featuredRate < 1);
  const standardBanners = shown.filter((banner) => banner.featuredRate >= 1);
  // A banner's pulls: the standard tickets, only its own tickets (Endfield's Arsenal, the Bangboo channel), or the limited ones plus any of its own.
  const pullsOn = (available: typeof have, banner: (typeof eventBanners)[number]) =>
    banner.fund === "standard" || banner.key === "standard" ? available.standard : (banner.fund === "own" ? 0 : available.limited) + (available.only[banner.key] ?? 0);
  const card = (banner: (typeof eventBanners)[number]) => (
    <BannerCard
      key={banner.key}
      banner={banner}
      gameKey={game.key}
      instanceId={instance.data.id}
      running={live.filter((liveBanner) => liveBanner.kind === banner.key)}
      available={pullsOn(have, banner)}
      extra={pullsOn(topped, banner) - pullsOn(have, banner)}
      live={live.find((liveBanner) => liveBanner.kind === banner.key)}
      units={units}
      unitOf={unitOf}
      onAdd={(body) => add.mutate(body)}
      onCalibrate={(body) => calibrate.mutate(body)}
      onUndo={(entryId) => undo.mutate(entryId)}
      onHide={() => hide.mutate([...hidden, banner.key])}
    />
  );
  const drops = log.data.banners
    .flatMap((banner) => banner.fiveStars.map((fiveStar) => ({ ...fiveStar, banner })))
    .sort((first, second) => second.at.localeCompare(first.at));
  // The planner's targets: each event banner's featured 5★, character first, then the
  // wishlisted 5★ not already among them; all share the limited pulls.
  // The other event banners (collaborations, Chronicled…) join only while one is running.
  const planned = eventBanners.filter((banner) => banner.fund !== "own" && (banner.key === "character" || banner.key === "weapon" || live.some((liveBanner) => liveBanner.kind === banner.key)));
  const running = planned.map((banner) => {
    const liveBanner = live.find((candidate) => candidate.kind === banner.key);
    const featured = liveBanner?.featured.find((featuredUnit) => (featuredUnit.rarity ?? 0) >= 5);
    return { banner, liveBanner, featured };
  });
  const runningIds = new Set(running.map((entry) => entry.featured?.catalogId));
  const wished = (wishlist.data ?? []).flatMap((wish) => {
    const unit = wish.kind === "character" ? catalog?.characters.find((character) => character.id === wish.catalogId) : catalog?.weapons.find((weapon) => weapon.id === wish.catalogId);
    const banner = planned.find((candidate) => candidate.key === wish.kind);
    return unit && banner && unit.rarity >= 5 && !runningIds.has(wish.catalogId) ? [{ banner, name: unit.name, unit: { kind: wish.kind as "character" | "weapon", catalogId: wish.catalogId } }] : [];
  });
  const firstOn = new Set<string>();
  // Only a banner's first target starts from its pity and guarantee; the ones after start fresh.
  const stateFor = (banner: (typeof eventBanners)[number]) => {
    const fresh = firstOn.has(banner.key);
    firstOn.add(banner.key);
    return fresh ? { pity: 0, guaranteed: false } : { pity: banner.state.pity, guaranteed: banner.state.guaranteed };
  };
  const targets: PlannerTarget[] = [
    ...running.map(({ banner, liveBanner, featured }) => ({
      label: featured?.name ?? banner.label,
      sub: liveBanner?.name ?? banner.label,
      endsAt: liveBanner?.endsAt,
      rules: banner,
      state: stateFor(banner),
      available: topped.limited,
      unit: featured ? { kind: featured.kind, catalogId: featured.catalogId } : undefined,
    })),
    ...wished.map(({ banner, name, unit }) => ({ label: name, sub: `Wishlist · ${banner.label}`, rules: banner, state: stateFor(banner), available: topped.limited, unit })),
  ];

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs
          instanceId={instance.data.id}
          active="pulls"
          gameKey={game.key}
        />
      </div>
      <div className="pl-top">
        <section className="card" aria-label="Pulls available">
          <h3>Pulls available</h3>
          <div className="kpi-value">
            {have.limited}{" "}
            <small>
              limited{have.standard ? ` · +${have.standard} standard` : ""}
              {Object.entries(have.only).map(([bannerKey, count]) => (count ? ` · +${count} ${log.data.banners.find((banner) => banner.key === bannerKey)?.label ?? bannerKey}` : ""))}
            </small>
          </div>
          <table>
            <tbody>
              {pullCurrencies.map((pullCurrency) => (
                <tr key={pullCurrency.key}>
                  <td>
                    <CurrencyIcon kind={currencyKind(game, pullCurrency)} />
                    {pullCurrency.label}
                  </td>
                  <td className="num">{NUMBER_FORMAT.format(pullCurrency.value)}</td>
                  <td className="num mu">= {Math.floor(pullCurrency.value / pullCurrency.pullCost!)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {topUpCurrency && (
            <div className="pl-sim">
              <span className="kpi-value pl-plus" aria-hidden="true">+</span>
              <input
                type="number"
                min={0}
                max={10_000_000}
                aria-label="Amount to add"
                placeholder="0"
                value={topUp.amount || ""}
                onChange={(event) => setTopUp({ key: topUpCurrency.key, amount: Math.max(0, Math.min(10_000_000, Number(event.target.value) || 0)) })}
              />
              <select aria-label="Currency to add" value={topUpCurrency.key} onChange={(event) => setTopUp({ ...topUp, key: event.target.value })}>
                {pullCurrencies.map((pullCurrency) => (
                  <option key={pullCurrency.key} value={pullCurrency.key}>{pullCurrency.label}</option>
                ))}
              </select>
              <span className="mn">{topUp.amount > 0 ? `+${topped.limited + topped.standard + topped.special - have.limited - have.standard - have.special} pulls` : ""}</span>
            </div>
          )}
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
              {forecast.lines.map((line) => (
                <tr key={line.key}>
                  <td>
                    {line.label} · {line.days} days × {line.perDay}
                  </td>
                  <td className="num">{NUMBER_FORMAT.format(line.total)}</td>
                </tr>
              ))}
              {forecast.lines.length === 0 && (
                <tr>
                  <td colSpan={2} className="mu">
                    No daily income on record for this game yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Each target alone (Georges, round 5: "X% chance to get X limited … use icons"): its chance with the pulls you have, and with the forecast added. */}
          {targets.length > 0 && (
            <ul className="pl-chances" aria-label="Chances">
              <li className="pl-chances-head mn mu" aria-hidden="true">
                <span />
                <span />
                <span>now</span>
                <span>by {DAY.format(forecast.until)}</span>
              </li>
              {targets.map((target, targetIndex) => {
                const now = featuredWithin(target.rules, target.state, target.available);
                const then = featuredWithin(target.rules, target.state, target.available + forecast.pulls);
                return (
                  <li key={target.label + targetIndex} className="pl-chances-row">
                    {target.unit ? <UnitIcon gameKey={game.key} unit={target.unit} /> : <Glyph kind={bannerGlyph(target.rules.key)} label={target.label} />}
                    <span className="pl-chances-name">
                      <strong>{target.label}</strong>
                      <span className="mn mu">{target.sub}</span>
                    </span>
                    {[now, then].map((amount, amountIndex) => (
                      <span key={amountIndex} className="pl-chances-v" title={`${percentText(amount)} ${amountIndex ? `by ${DAY.format(forecast.until)}, with ${target.available + forecast.pulls} pulls` : `now, with ${target.available} pulls`}`}>
                        <span className={`act-meter act-meter-thin ${amountIndex ? "" : "is-now"}`} aria-hidden="true">
                          <span style={{ width: `${Math.round(amount * 100)}%` }} />
                        </span>
                        <span className="mn">{percentText(amount)}</span>
                      </span>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>


      <div className="pl-label">
        <span className="kpi-label">Banners</span>
      </div>
      {/* One grid, so hiding a banner keeps the rows even (Georges, round 6); an odd last one spans the row. */}
      <div className="pl-banners">{[...eventBanners, ...standardBanners].map(card)}</div>
      {/* Only banners the screen shows: a hidden beginner banner is gone for good (round 6). */}
      {log.data.banners.some((banner) => hidden.includes(banner.key)) && (
        <p className="mn mu pl-hidden">
          Hidden:{" "}
          {log.data.banners
            .filter((banner) => hidden.includes(banner.key))
            .map((banner) => (
              <button key={banner.key} className="btn ghost" aria-label={`Show ${banner.label}`} onClick={() => hide.mutate(hidden.filter((hiddenKey) => hiddenKey !== banner.key))}>
                {banner.label} · show
              </button>
            ))}
        </p>
      )}

      <BannerHistory instanceId={instance.data.id} unitOf={nameOf} />
      <div className="pl-bottom">
        <SavingsPlanner targets={targets} forecast={forecast.pulls} star={star} />
        <PullHistory instanceId={instance.data.id} drops={drops} star={star} unitOf={nameOf} units={units} />
      </div>
      {/* Top-ups at the very bottom (Georges, round 8: "it takes too much space"). */}
      <div className="pl-tops-row">
        <TopUpHistory instanceId={id!} game={game} />
        {game.manifest.topUp && targets.some((target) => target.endsAt) && <TopUpCard game={game} region={region} passEnds={passEnds} targets={targets.filter((target) => target.endsAt)} />}
      </div>
    </>
  );
}
