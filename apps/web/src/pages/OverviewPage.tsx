import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getGame, pullsFor, type BannerDto, type GameDefinition } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { formatRemaining } from "../lib/time";
import { GameTabs } from "../components/GameTabs";
import { CatalogIcon } from "../components/CatalogIcon";
import type { DashboardData, InstanceDetail } from "../lib/types";

type DashGame = DashboardData["games"][number];

/**
 * A game's Overview (Georges's designs of 2026-10-11, WIREFRAMES.md G0): the
 * hub's landing screen, what this one game needs at a glance and nothing else.
 * Each card opens its screen.
 */
export function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || dash.isError) return <LoadError what="The overview" retry={() => Promise.all([instance.refetch(), dash.refetch()])} />;
  const g = dash.data?.games.find((x) => x.instanceId === id);
  if (!instance.data || !game || !dash.data || !g) return <div className="mu">Loading…</div>;
  const banners = dash.data.timeline.banners.filter((b) => b.gameKey === game.key);

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="overview" gameKey={game.key} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <div className="ov-grid">
        {game.pullBanners?.length ? (
          <>
            <PullsCard g={g} instanceId={id!} />
            <PityCard g={g} game={game} instanceId={id!} />
          </>
        ) : null}
        <BannersCard banners={banners} game={game} />
      </div>
    </>
  );
}

/** A card's title, linking to its screen. */
function Head({ title, to, children }: { title: string; to?: string; children?: ReactNode }) {
  return (
    <div className="ov-head">
      <h3>{to ? <Link to={to}>{title}</Link> : title}</h3>
      {children}
    </div>
  );
}

/** Limited pulls on hand: the total, then what makes it (tickets, and the premium currency in pulls). */
function PullsCard({ g, instanceId }: { g: DashGame; instanceId: string }) {
  const rows = g.currencies.filter((c) => c.pullCost && !c.standardOnly && !c.onlyFor);
  return (
    <section className="card ov-card" aria-label="Pulls">
      <Head title="Pulls" to={`/games/${instanceId}/pulls`} />
      <div className="ov-big" data-testid="pulls-total">
        {pullsFor(g.currencies).limited}
      </div>
      <dl className="ov-rows">
        {rows.map((c) => (
          <div key={c.key}>
            <dt>{c.pullCost! > 1 ? `From ${c.label}` : c.label}</dt>
            <dd>{Math.floor(c.value / c.pullCost!)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Each banner type's pity, and whether the next top pull is the featured one. */
function PityCard({ g, game, instanceId }: { g: DashGame; game: GameDefinition; instanceId: string }) {
  return (
    <section className="card ov-card" aria-label="Pity">
      <Head title="Pity" to={`/games/${instanceId}/pulls`} />
      <dl className="ov-rows">
        {g.pity.map((p) => {
          // The featured unit's share, as the game says it: 50/50, 75/25.
          const rate = game.pullBanners?.find((b) => b.key === p.key)?.featuredRate ?? 1;
          const featured = rate < 1;
          const split = `${Math.round(rate * 100)}/${100 - Math.round(rate * 100)}`;
          return (
            <div key={p.key}>
              <dt>{p.label}</dt>
              <dd>
                {p.pity}/{p.hardPity}
                {featured && <span className={p.guaranteed ? "ov-hot" : "mu"}> · {p.guaranteed ? "guaranteed" : split}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/** The game's banner phases, the current one and the next; the arrows step through them. */
function BannersCard({ banners, game }: { banners: BannerDto[]; game: GameDefinition }) {
  // The page's moment, read once: "ends in" counts from when it opened.
  const [now] = useState(() => Date.now());
  const phases = [...new Set(banners.map((b) => b.startsAt))]
    .sort()
    .map((start) => banners.filter((b) => b.startsAt === start));
  const current = Math.max(0, phases.findIndex((p) => p.some((b) => new Date(b.endsAt).getTime() > now)));
  const [at, setAt] = useState<number | null>(null);
  const k = Math.min(at ?? current, Math.max(0, phases.length - 1));
  const top = game.topRarity ?? 5;
  const when = (p: BannerDto[]) => {
    const start = new Date(p[0]!.startsAt).getTime();
    const end = Math.min(...p.map((b) => new Date(b.endsAt).getTime()));
    return start > now ? `starts in ${formatRemaining(p[0]!.startsAt, now)}` : end > now ? `ends in ${formatRemaining(new Date(end).toISOString(), now)}` : "ended";
  };
  return (
    <section className="card ov-card" aria-label="Banners">
      <Head title="Banners" to="/timeline">
        <span className="ov-arrows">
          <button className="btn ghost sm" aria-label="Earlier banners" disabled={k === 0} onClick={() => setAt(k - 1)}>
            ◀
          </button>
          <button className="btn ghost sm" aria-label="Later banners" disabled={k >= phases.length - 2} onClick={() => setAt(k + 1)}>
            ▶
          </button>
        </span>
      </Head>
      {phases.length === 0 && <p className="mu">None</p>}
      {phases.slice(k, k + 2).map((p) => {
        const units = p.flatMap((b) => b.featured.filter((f) => !f.rarity || f.rarity >= top));
        return (
          <div key={p[0]!.startsAt} className="ov-phase">
            <span className="ov-units">
              {units.map((f) => (
                <CatalogIcon key={f.catalogId} gameKey={game.key} kind={f.kind} icon={f.icon} name={f.name ?? f.catalogId} />
              ))}
              {units.length === 0 && <span>{p.map((b) => b.name).join(" · ")}</span>}
            </span>
            <span className="mn">{when(p)}</span>
          </div>
        );
      })}
    </section>
  );
}
