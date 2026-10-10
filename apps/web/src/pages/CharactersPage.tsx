import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildKpis,
  buildLine,
  dupeBadge,
  featuredWithin,
  gearSetLabel,
  getGame,
  pullsFor,
  type BuildStatus,
  type CatalogCharacter,
  type CharacterDto,
  type DashboardDto,
  type OwnershipDto,
  type PullLogDto,
  type RewardDto,
  type WishlistItemDto,
} from "@gacha/shared";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { assetUrl, communityAssetUrl, splashKey } from "../lib/assets";
import { GameTabs } from "../components/GameTabs";
import { GameIcon } from "../components/GameIcon";
import type { InstanceDetail } from "../lib/types";

const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const PAGE = 12;
const STATUS_RANK: Record<BuildStatus, number> = { perfect: 0, good: 1, building: 2, none: 3 };

type Card = {
  id: string;
  name: string;
  rarity: number | null;
  tag: string | null;
  weaponType: string | null;
  icon: string | undefined;
  entry: CatalogCharacter | undefined;
  build: CharacterDto | undefined;
  owned: boolean;
  wished: boolean;
};

/**
 * A game's Characters (WIREFRAMES.md G4): filters and counts, then one splash
 * card per unit: art with rarity, element and dupes; the name box with level,
 * skills and weapon dupes; three KPIs for the build's role; build status, set
 * and Build →. Unowned units can be owned or wishlisted; wishlisted ones on a
 * running banner show your chance with the pulls you have.
 */
export function CharactersPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [element, setElement] = useState("");
  const [weapon, setWeapon] = useState("");
  const [rarity, setRarity] = useState("");
  const [owned, setOwned] = useState<"all" | "owned" | "unowned" | "wishlist">("all");
  const [status, setStatus] = useState<"" | BuildStatus>("");
  const [sort, setSort] = useState<"status" | "name" | "rarity" | "level">("status");
  const [shown, setShown] = useState(PAGE);

  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const ownership = useQuery({ queryKey: ["ownership", id], queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${id}/ownership`) });
  const wishlist = useQuery({ queryKey: ["wishlist", id], queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${id}/wishlist`) });
  const pulls = useQuery({ queryKey: ["pulls", id], queryFn: () => api.get<PullLogDto>(`/api/instances/${id}/pulls`) });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardDto>("/api/dashboard") });
  const rewards = useQuery({ queryKey: ["rewards"], queryFn: () => api.get<RewardDto[]>("/api/rewards") });
  const { catalog } = useCatalog(instance.data?.gameKey);

  const own = useMutation({
    mutationFn: (ids: string[]) => api.put(`/api/instances/${id}/ownership`, { items: ids.map((catalogId) => ({ kind: "character", catalogId, owned: true })) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ownership", id] }),
  });
  const wish = useMutation({
    mutationFn: (v: { catalogId: string; wished: boolean }) => api.put(`/api/instances/${id}/wishlist`, { kind: "character", ...v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist", id] }),
  });
  const start = useMutation({
    mutationFn: (catalogId: string) => api.post<{ id: string }>(`/api/instances/${id}/characters`, { catalogId }),
    onSuccess: (r) => nav(`/characters/${r.id}`),
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || builds.isError) {
    return (
      <div className="card" role="alert">
        <p>Characters could not load.</p>
        <button className="btn" onClick={() => void Promise.all([instance.refetch(), builds.refetch()])}>Try again</button>
      </div>
    );
  }
  if (!instance.data || !builds.data || !game) return <div className="mu">Loading…</div>;

  const byCatalog = new Map(builds.data.filter((b) => b.catalogId).map((b) => [b.catalogId!, b]));
  const ownedIds = new Set((ownership.data ?? []).filter((o) => o.kind === "character").map((o) => o.catalogId));
  const wishedIds = new Set((wishlist.data ?? []).filter((w) => w.kind === "character").map((w) => w.catalogId));
  const cards: Card[] = catalog
    ? catalog.characters.map((c) => ({ id: c.id, name: c.name, rarity: c.rarity, tag: c.tag ?? null, weaponType: c.weaponType ?? null, icon: c.icon, entry: c, build: byCatalog.get(c.id), owned: ownedIds.has(c.id) || byCatalog.has(c.id), wished: wishedIds.has(c.id) }))
    : builds.data.map((b) => ({ id: b.id, name: b.name, rarity: null, tag: null, weaponType: null, icon: undefined, entry: undefined, build: b, owned: true, wished: false }));

  const live = (dash.data?.timeline.banners ?? []).filter((b) => b.gameKey === game.key && b.status === "active" && b.kind === "character");
  const characterBanner = pulls.data?.banners.find((b) => b.key === "character");
  const available = pullsFor(game.currencies.filter((c) => c.pullCost).map((c) => ({ ...c, value: instance.data.currencies.find((x) => x.key === c.key)?.value ?? 0 }))).limited;
  const eventStep = (catalogId: string) =>
    (rewards.data ?? [])
      .filter((r) => r.instanceId === id && r.goal && !r.goal.claimed)
      .flatMap((r) => r.options[r.goal!.choice ?? 0]?.changes ?? [])
      .find((c) => c.catalogId === catalogId);

  const level = (c: Card) => Number((c.build?.doc as { level?: number } | undefined)?.level ?? 0);
  const filtered = cards
    .filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
    .filter((c) => !element || c.tag === element)
    .filter((c) => !weapon || c.weaponType === weapon)
    .filter((c) => !rarity || String(c.rarity) === rarity)
    .filter((c) => (owned === "owned" ? c.owned : owned === "unowned" ? !c.owned : owned === "wishlist" ? c.wished : true))
    .filter((c) => !status || (c.build?.buildStatus ?? "none") === status)
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "rarity"
          ? (b.rarity ?? 0) - (a.rarity ?? 0) || a.name.localeCompare(b.name)
          : sort === "level"
            ? level(b) - level(a) || a.name.localeCompare(b.name)
            : // Built characters first: owned, then with a build, then by status; wishlisted before the rest.
              Number(b.owned) - Number(a.owned) || Number(Boolean(b.build)) - Number(Boolean(a.build)) || STATUS_RANK[a.build?.buildStatus ?? "none"] - STATUS_RANK[b.build?.buildStatus ?? "none"] || Number(b.wished) - Number(a.wished) || a.name.localeCompare(b.name),
    );
  const count = (s: BuildStatus) => cards.filter((c) => c.owned && (c.build?.buildStatus ?? "none") === s).length;
  const options = (pick: (c: Card) => string | null) => [...new Set(cards.map(pick).filter((v): v is string => Boolean(v)))].sort();
  const unownedShown = filtered.slice(0, shown).filter((c) => !c.owned && c.entry).map((c) => c.id);

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={instance.data.id} active="characters" gameKey={game.key} hasCatalog={Boolean(game.loadCatalog)} />
      </div>
      <section className="card ch-filters" aria-label="Filters">
        <label>
          Search
          <input type="search" aria-label="Search" placeholder="Name" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {catalog && (
          <>
            <Select label="Element" value={element} onChange={setElement} options={options((c) => c.tag)} />
            <Select label="Weapon" value={weapon} onChange={setWeapon} options={options((c) => c.weaponType)} />
            <Select label="Rarity" value={rarity} onChange={setRarity} options={options((c) => (c.rarity ? String(c.rarity) : null))} />
            <label>
              Owned
              <select value={owned} onChange={(e) => setOwned(e.target.value as typeof owned)}>
                <option value="all">All</option>
                <option value="owned">Owned</option>
                <option value="unowned">Not owned</option>
                <option value="wishlist">Wishlist</option>
              </select>
            </label>
          </>
        )}
        <label>
          Build status
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="">Any</option>
            <option value="perfect">Perfect</option>
            <option value="good">Good</option>
            <option value="building">Building</option>
            <option value="none">Unbuilt</option>
          </select>
        </label>
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="status">Build status</option>
            <option value="name">Name</option>
            <option value="rarity">Rarity</option>
            <option value="level">Level</option>
          </select>
        </label>
      </section>

      <div className="ch-counts">
        <span className="badge done">{cards.filter((c) => c.owned).length} / {cards.length} owned</span>
        <span className="badge">Perfect {count("perfect")}</span>
        <span className="badge">Good {count("good")}</span>
        <span className="badge">Building {count("building")}</span>
        <span className="badge">Unbuilt {count("none")}</span>
        {catalog && <span className="badge todo">Wishlist {cards.filter((c) => c.wished).length}</span>}
        <span className="ch-sp" />
        {unownedShown.length > 0 && (
          <button className="btn" disabled={own.isPending} onClick={() => own.mutate(unownedShown)}>
            Own all shown
          </button>
        )}
      </div>

      <div className="ch-grid">
        {filtered.slice(0, shown).map((c) => {
          const doc = (c.build?.doc ?? {}) as Record<string, unknown>;
          const onBanner = live.find((b) => b.featured.some((f) => f.catalogId === c.id));
          const step = eventStep(c.id);
          const art = splashKey(game.key, c.icon);
          return (
            <article key={c.id} className={`ch-card ${c.owned ? "" : "is-unowned"}`} aria-label={c.name}>
              <div className="ch-art">
                <GameIcon
                  src={c.build?.portraitUrl ?? assetUrl(game.key, "portrait", art)}
                  fallback={[communityAssetUrl(game.key, "portrait", art), communityAssetUrl(game.key, "character", c.icon)]}
                  alt={c.name}
                  label={c.name.slice(0, 2)}
                />
                <div className="ch-chips">
                  {c.rarity && <span className="badge">★{c.rarity}</span>}
                  {c.tag && c.tag !== "None" && <span className="badge">{c.tag}</span>}
                </div>
                <span className={`ch-dupes ${c.owned ? "" : "is-off"}`}>{c.owned ? dupeBadge(game, doc) : "Not owned"}</span>
                <div className="ch-namebox">
                  <h3>{c.name}</h3>
                  <div className="mn">
                    {c.build ? buildLine(game, doc, c.entry?.talents.keys ?? []) : onBanner ? `on the banner until ${ENDS.format(new Date(onBanner.endsAt))}` : c.owned ? "no build yet" : "not owned"}
                  </div>
                </div>
              </div>
              {c.build ? (
                <div className="ch-kpis">
                  {buildKpis(game, doc, c.build.role).map((k) => (
                    <div key={k.label}>
                      <span className="kpi-label">{k.label}</span>
                      <span className="cd">{k.value}</span>
                    </div>
                  ))}
                </div>
              ) : !c.owned && onBanner && characterBanner ? (
                <div className="ch-kpis ch-chance">
                  <div>
                    <span className="kpi-label">Chance with your {available} pulls</span>
                    <span className="cd">{Math.round(featuredWithin(characterBanner, characterBanner.state, available) * 100)}%{characterBanner.state.guaranteed ? " · guaranteed" : ""}</span>
                  </div>
                </div>
              ) : null}
              <div className="ch-foot">
                {c.build && <span className={`badge ${c.build.buildStatus === "perfect" ? "done" : ""}`}>{c.build.buildStatus === "none" ? "Unbuilt" : c.build.buildStatus}</span>}
                {c.build && <span className="mu ch-set">{gearSetLabel(game, doc) ?? c.build.role ?? ""}</span>}
                {step && <span className="badge todo">→ {step.letter}{step.to} · event</span>}
                <span className="ch-sp" />
                {c.build ? (
                  <Link to={`/characters/${c.build.id}`}>Build →</Link>
                ) : c.owned ? (
                  <button className="btn ghost" disabled={start.isPending} onClick={() => start.mutate(c.id)}>Start a build</button>
                ) : onBanner ? (
                  <Link to={`/games/${id}/pulls`}>Plan pulls →</Link>
                ) : null}
              </div>
              {!c.owned && c.entry && (
                <div className="ch-own">
                  <button className="btn" onClick={() => own.mutate([c.id])}>Own</button>
                  <button className="btn" aria-pressed={c.wished} onClick={() => wish.mutate({ catalogId: c.id, wished: !c.wished })}>Wishlist</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <div className="ch-more">
        <span className="mu">
          {Math.min(shown, filtered.length)} of {filtered.length} shown · {sort === "status" ? "built characters first" : `by ${sort}`}
        </span>
        {filtered.length > shown && (
          <button className="btn" onClick={() => setShown(shown + PAGE)}>
            Show {Math.min(PAGE, filtered.length - shown)} more
          </button>
        )}
      </div>
    </>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
