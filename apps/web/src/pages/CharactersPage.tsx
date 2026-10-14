import { useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  elementColor,
  buildBase,
  cardStatLabels,
  cardStatOptions,
  buildLine,
  statKpis,
  dupeBadge,
  dupeLetter,
  featuredWithin,
  completedSets,
  getGame,
  pullsFor,
  weaponHolder,
  type BuildStatus,
  type CatalogCharacter,
  type CharacterDto,
  type DashboardDto,
  type OwnershipDto,
  type PullLogDto,
  type RewardDto,
  type WishlistItemDto,
} from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { assetUrl, communityAssetUrl, splashKey } from "../lib/assets";
import { GameTabs } from "../components/GameTabs";
import { CatalogIcon } from "../components/CatalogIcon";
import { GameIcon } from "../components/GameIcon";
import { Chips, Segmented } from "../components/ui";

import { BuildsTable } from "../components/characters/BuildsTable";
import { CardStats } from "../components/characters/CardStats";
import { QuickBuild } from "../components/tasks/QuickBuild";
import type { InstanceDetail } from "../lib/types";

const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const STATUS_RANK: Record<BuildStatus, number> = { perfect: 0, good: 1, building: 2, none: 3 };

type Card = {
  id: string;
  name: string;
  rarity: number | null;
  tag: string | null;
  weaponType: string | null;
  icon: string | undefined;
  splash?: string;
  entry: CatalogCharacter | undefined;
  build: CharacterDto | undefined;
  owned: boolean;
  wished: boolean;
};

/**
 * A game's Characters (WIREFRAMES.md G4): filters, and counts that filter,
 * then every unit at once as a splash card tinted to its element: art with
 * rarity, element, weapon type and dupes; the name box with level, skills and
 * weapon dupes; three KPIs for the build's role; build status and set. The
 * whole card opens the build, or the unit's page when it has none. Unowned
 * units can be owned or wishlisted; wishlisted ones on a running banner show
 * your chance with the pulls you have. Select picks several units to own,
 * wishlist or start builds for at once. Builds lists every build in one
 * table; Weapons lists the catalog's weapons and who holds them.
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
  const [kind, setKind] = useState<"characters" | "builds">("characters");
  // Several units at once (Georges, 2026-10-10): in Select, a click picks the card, and the whole card lights up (round 5).
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [quick, setQuick] = useState<string[] | null>(null);
  const [newName, setNewName] = useState("");

  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const ownership = useQuery({ queryKey: ["ownership", id], queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${id}/ownership`) });
  const wishlist = useQuery({ queryKey: ["wishlist", id], queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${id}/wishlist`) });
  const pulls = useQuery({ queryKey: ["pulls", id], queryFn: () => api.get<PullLogDto>(`/api/instances/${id}/pulls`) });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardDto>("/api/dashboard") });
  const rewards = useQuery({ queryKey: ["rewards"], queryFn: () => api.get<RewardDto[]>("/api/rewards") });
  const { catalog, index, isLoading: catalogLoading } = useCatalog(instance.data?.gameKey);

  // The cache takes what was saved at once, then refetches: the cards flip on the answer, not on a refetch that can lag.
  const markOwned = (ids: string[], owned: boolean) => {
    qc.setQueryData<OwnershipDto[]>(["ownership", id], (old = []) => [
      ...old.filter((o) => !(o.kind === "character" && ids.includes(o.catalogId))),
      ...(owned ? ids.map((catalogId) => ({ kind: "character" as const, catalogId, qty: 1, meta: null })) : []),
    ]);
    return qc.invalidateQueries({ queryKey: ["ownership", id] });
  };
  const own = useMutation({
    mutationFn: (ids: string[]) => api.put(`/api/instances/${id}/ownership`, { items: ids.map((catalogId) => ({ kind: "character", catalogId, owned: true })) }),
    onSuccess: (_r, ids) => markOwned(ids, true),
  });
  const unown = useMutation({
    mutationFn: (ids: string[]) => api.put(`/api/instances/${id}/ownership`, { items: ids.map((catalogId) => ({ kind: "character", catalogId, owned: false })) }),
    onSuccess: (_r, ids) => markOwned(ids, false),
  });
  const wishMany = useMutation({
    mutationFn: (v: { ids: string[]; wished: boolean }) => Promise.all(v.ids.map((catalogId) => api.put(`/api/instances/${id}/wishlist`, { kind: "character", catalogId, wished: v.wished }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist", id] }),
  });
  // Ownership is the owned list alone: a build stays when its character is marked not owned (Georges, round 6).
  const setBuildStatus = useMutation({
    mutationFn: (v: { ids: string[]; buildStatus: BuildStatus }) => Promise.all(v.ids.map((b) => api.put(`/api/characters/${b}`, { buildStatus: v.buildStatus }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters", id] }),
  });
  const startMany = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((catalogId) => api.post(`/api/instances/${id}/characters`, { catalogId }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters", id] }),
  });
  const wish = useMutation({
    mutationFn: (v: { catalogId: string; wished: boolean; kind?: "character" | "weapon" }) => api.put(`/api/instances/${id}/wishlist`, { kind: "character", ...v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist", id] }),
  });
  // A card's own stats (Georges, round 6: "I can choose for each one character what I want to show").
  const setBuildStats = useMutation({
    // One save at a time, a read in flight cancelled, read back after the last: as the game's card stats.
    scope: { id: `build-stats-${id}` },
    mutationKey: ["build-stats", id],
    mutationFn: (v: { id: string; cardStats: string[] | null }) => api.put(`/api/characters/${v.id}`, { cardStats: v.cardStats }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["characters", id] });
      qc.setQueryData<CharacterDto[]>(["characters", id], (old) => old?.map((b) => (b.id === v.id ? { ...b, cardStats: v.cardStats } : b)));
    },
    onSettled: () => qc.isMutating({ mutationKey: ["build-stats", id] }) === 1 && qc.invalidateQueries({ queryKey: ["characters", id] }),
  });
  // The stats the cards show, picked for the game (Georges, round 5); none picked shows each build's role's.
  const setCardStats = useMutation({
    // One save at a time: quick picks sent together could land out of order and keep an older pick.
    scope: { id: `card-stats-${id}` },
    mutationKey: ["card-stats", id],
    mutationFn: (cardStats: string[] | null) => api.put(`/api/instances/${id}`, { cardStats }),
    // A read in flight would put back the stats from before the picks, and the next pick would build on them.
    onMutate: async (cardStats) => {
      await qc.cancelQueries({ queryKey: ["instance", id] });
      qc.setQueryData<InstanceDetail>(["instance", id], (old) => (old ? { ...old, cardStats } : old));
    },
    // Read back once the last pick is saved.
    onSettled: () => qc.isMutating({ mutationKey: ["card-stats", id] }) === 1 && qc.invalidateQueries({ queryKey: ["instance", id] }),
  });
  const start = useMutation({
    mutationFn: (v: string | { name: string }) => api.post<{ id: string }>(`/api/instances/${id}/characters`, typeof v === "string" ? { catalogId: v } : v),
    onSuccess: (r) => nav(`/characters/${r.id}`),
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || builds.isError) return <LoadError what="Characters" retry={() => Promise.all([instance.refetch(), builds.refetch()])} />;
  // A game with a catalog waits for it: without it the page would fall back to one card per build.
  if (!instance.data || !builds.data || !game || catalogLoading) return <div className="mu">Loading…</div>;

  // Each unit's card shows its default build (the flagged one, else its first).
  const byCatalog = new Map<string, CharacterDto>();
  for (const b of builds.data) if (b.catalogId && (b.isDefault || !byCatalog.has(b.catalogId))) byCatalog.set(b.catalogId, b);
  const ownedIds = new Set((ownership.data ?? []).filter((o) => o.kind === "character").map((o) => o.catalogId));
  const wishedIds = new Set((wishlist.data ?? []).filter((w) => w.kind === "character").map((w) => w.catalogId));
  const cards: Card[] = catalog
    ? catalog.characters.map((c) => ({ id: c.id, name: c.name, rarity: c.rarity, tag: c.tag ?? null, weaponType: c.weaponType ?? null, icon: c.icon, splash: c.splash, entry: c, build: byCatalog.get(c.id), owned: ownedIds.has(c.id), wished: wishedIds.has(c.id) }))
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
  const unownedShown = filtered.filter((c) => !c.owned && c.entry).map((c) => c.id);

  const togglePick = (cid: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(cid)) n.delete(cid);
      else n.add(cid);
      return n;
    });
  const pickedCards = cards.filter((c) => picked.has(c.id));
  // A build's weapon as the card shows it: the catalog's name and icon, its level and refinement.
  const heldOf = (b: CharacterDto | undefined) => {
    const held = b && holder ? ((b.doc as Record<string, unknown>)[holder] as Record<string, unknown> | undefined) : undefined;
    const w = held?.catalogId ? catalog?.weapons.find((x) => x.id === held.catalogId) : undefined;
    if (!held || (!w && !held.name)) return null;
    const dupe = dupeField ? held[dupeField.split(".").at(-1)!] : undefined;
    const level = typeof held.level === "number" ? held.level : null;
    const rank = `${dupeLetter(dupeField ?? "")}${typeof dupe === "number" ? dupe : 1}`;
    return { name: w?.name ?? String(held.name), icon: w?.icon, level, rank };
  };
  const holder = weaponHolder(game);
  const dupeField = game.manifest.dupes.weapon?.field;
  const gearSets = new Map((catalog?.gear ?? []).map((g) => [g.name, g]));
  const cardStats = instance.data.cardStats ?? null;
  const statOptions = cardStatOptions(game, builds.data.map((b) => b.doc as Record<string, unknown>));
  const toggleStat = (s: string) => {
    const now = cardStats ?? [];
    const next = now.includes(s) ? now.filter((x) => x !== s) : [...now, s].slice(-6);
    setCardStats.mutate(next.length ? next : null);
  };

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={instance.data.id} active="characters" gameKey={game.key} />
      </div>
      <section className="card ch-filters" aria-label="Filters">
        <label>
          Search
          <input type="search" aria-label="Search" placeholder="Name" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {catalog && (
          <>
            <Chips label="Element" value={element} onChange={setElement} options={options((c) => (c.tag === "None" ? null : c.tag))} color={(t) => elementColor(game.key, t)} />
            <Chips label="Weapon" value={weapon} onChange={setWeapon} options={options((c) => c.weaponType)} />
            <Chips label="Rarity" value={rarity} onChange={setRarity} options={options((c) => (c.rarity ? String(c.rarity) : null)).reverse()} text={(r) => `★${r}`} />
          </>
        )}
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="status">Build status</option>
            <option value="name">Name</option>
            <option value="rarity">Rarity</option>
            <option value="level">Level</option>
          </select>
        </label>
        {catalog && (
          <Segmented
            label="Show"
            options={[{ value: "characters", label: "Characters" }, { value: "builds", label: "Builds" }]}
            value={kind}
            onChange={setKind}
          />
        )}
        <div className="ch-chipset ch-stats">
          <span className="kpi-label">Card stats</span>
          <div role="group" aria-label="Card stats">
            <button type="button" className="ch-chip" aria-pressed={!cardStats} onClick={() => setCardStats.mutate(null)}>
              Role
            </button>
            {statOptions.map((s) => (
              <button key={s} type="button" className="ch-chip" aria-pressed={cardStats?.includes(s) ?? false} onClick={() => toggleStat(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {kind === "builds" ? (
        <BuildsTable instanceId={id!} game={game} builds={builds.data.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()))} entryOf={(cid) => (cid ? catalog?.characters.find((c) => c.id === cid) : undefined)} />
      ) : (
        <>

      <div className="ch-counts" role="group" aria-label="Filter by count">
        {([
          ["all", "All", cards.length],
          ["owned", "Owned", cards.filter((c) => c.owned).length],
          ...(catalog ? [["unowned", "Not owned", cards.filter((c) => !c.owned).length], ["wishlist", "Wishlist", cards.filter((c) => c.wished).length]] : []),
        ] as [typeof owned, string, number][]).map(([v, label, n]) => (
          <button key={v} className="chip" aria-pressed={owned === v} onClick={() => setOwned(owned === v ? "all" : v)}>
            {label} {n}
          </button>
        ))}
        <span className="ch-gap" />
        {(["perfect", "good", "building", "none"] as const).map((v) => (
          <button key={v} className="chip" aria-pressed={status === v} onClick={() => setStatus(status === v ? "" : v)}>
            {v === "none" ? "Unbuilt" : v.charAt(0).toUpperCase() + v.slice(1)} {count(v)}
          </button>
        ))}
        {!catalog && (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) start.mutate({ name: newName.trim() });
            }}
          >
            <input aria-label="Character name" placeholder="Character name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="btn" type="submit" disabled={!newName.trim() || start.isPending}>+ Add</button>
          </form>
        )}
        <span className="ch-sp" />
        {catalog && (
          <button
            className="btn"
            aria-pressed={selecting}
            onClick={() => {
              setSelecting(!selecting);
              setPicked(new Set());
            }}
          >
            Select
          </button>
        )}
        {unownedShown.length > 0 && (
          <button className="btn" disabled={own.isPending} onClick={() => own.mutate(unownedShown)}>
            Own all shown
          </button>
        )}
      </div>

      <div className="ch-grid">
        {filtered.map((c) => {
          const doc = (c.build?.doc ?? {}) as Record<string, unknown>;
          const onBanner = live.find((b) => b.featured.some((f) => f.catalogId === c.id));
          const step = eventStep(c.id);
          const art = splashKey(game.key, c.icon, c.splash);
          const el = elementColor(game.key, c.tag);
          const held = heldOf(c.build);
          // The whole card opens the build, or the unit's page when there is none.
          const to = c.build ? `/characters/${c.build.id}` : c.entry ? `/games/${id}/units/${c.id}` : null;
          return (
            <article key={c.id} className={`ch-card ${c.owned ? "" : "is-unowned"} ${selecting && picked.has(c.id) ? "is-picked" : ""}`} data-game={game.key} aria-label={c.name} style={el ? ({ "--el": el } as CSSProperties) : undefined}>
              {selecting && c.entry ? (
                <label className="ch-open ch-picking">
                  <input type="checkbox" className="ch-pick" aria-label={`Select ${c.name}`} checked={picked.has(c.id)} onChange={() => togglePick(c.id)} />
                </label>
              ) : (
                to && <Link to={to} className="ch-open" aria-label={`Open ${c.name}`} />
              )}
              <div className="ch-art">
                <GameIcon
                  src={c.build?.portraitUrl ?? assetUrl(game.key, "splash", art)}
                  fallback={[communityAssetUrl(game.key, "splash", art), communityAssetUrl(game.key, "character", c.icon)]}
                  alt={c.name}
                  glyph="character"
                />
                <div className="ch-chips">
                  {c.rarity && <span className="badge">★{c.rarity}</span>}
                  {c.tag && c.tag !== "None" && <span className="badge ch-el">{c.tag}</span>}
                  {c.weaponType && <span className="badge">{c.weaponType}</span>}
                </div>
                <span className={`ch-dupes ${c.owned ? "" : "is-off"}`}>{c.owned ? dupeBadge(game, doc) : "Not owned"}</span>
                <div className="ch-namebox">
                  <div className="ch-namebox-text">
                    <h3>{c.name}</h3>
                    <div className="mn ch-namebox-line">
                      {c.build ? buildLine(game, doc, c.entry?.talents.keys ?? [], !held) : onBanner ? `on the banner until ${ENDS.format(new Date(onBanner.endsAt))}` : c.owned ? "no build yet" : "not owned"}
                    </div>
                  </div>
                  {/* Its weapon on the name card (Georges, round 4), on the right, its level top-left and refinement bottom-right (round 5). */}
                  {held && (
                    <span className="ch-weapon" title={[held.name, held.level !== null && `Lv ${held.level}`, held.rank].filter(Boolean).join(" · ")}>
                      <GameIcon src={assetUrl(game.key, "weapon", held.icon)} fallback={communityAssetUrl(game.key, "weapon", held.icon)} alt={held.name} glyph="weapon" />
                      {held.level !== null && <span className="mn ch-weapon-lv">{held.level}</span>}
                      <span className="mn ch-weapon-r">{held.rank}</span>
                    </span>
                  )}
                </div>
              </div>
              {c.build ? (
                <CardStats
                  name={c.name}
                  options={statOptions}
                  kpis={statKpis(game, doc, cardStatLabels(game, c.entry, c.build.role, c.build.cardStats, cardStats), catalog?.gear ?? [], buildBase(game, index, c.build.catalogId, doc))}
                  own={c.build.cardStats}
                  growth={c.entry?.bonusStats?.[0]}
                  onPick={(stats) => setBuildStats.mutate({ id: c.build!.id, cardStats: stats })}
                />
              ) : c.entry && !(!c.owned && onBanner && characterBanner) ? (
                // No build yet: the character's own data, its base stats at its top level, its growth stat first (Georges, round 7).
                <CardStats
                  name={c.name}
                  options={[]}
                  own={null}
                  growth={c.entry.bonusStats?.[0]}
                  baseNote={`Base at Lv ${c.entry.maxLevel}`}
                  kpis={statKpis(game, {}, [...new Set([...(c.entry.bonusStats?.slice(0, 1) ?? []), "HP", "ATK", "DEF"])], [], buildBase(game, index, c.entry.id, { level: c.entry.maxLevel }))}
                />
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
                {c.build && (
                  <span className="mu ch-set">
                    {/* The completed sets as their icons with their counts (Georges, round 6), the role where none is. */}
                    {completedSets(game, doc).map((s) => {
                      const set = gearSets.get(s.name);
                      return (
                        <span key={s.name} className="ch-set-icon" title={`${s.name} ${s.size}pc`}>
                          <CatalogIcon gameKey={game.key} kind="gear" icon={set?.icon} name={s.name} />
                          <b className="mn">{s.size}</b>
                        </span>
                      );
                    })}
                    {completedSets(game, doc).length === 0 && (c.build.role ?? "")}
                  </span>
                )}
                {step && <span className="badge todo">→ {step.letter}{step.to} · event</span>}
                <span className="ch-sp" />
                {c.build ? null : c.owned ? (
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
      {quick && <QuickBuild instanceId={id!} gameKey={game.key} catalogIds={quick} onClose={() => setQuick(null)} />}
      {/* The bar from the moment Select is on, All shown in it (round 7: no select all until one was picked). */}
      {(selecting || picked.size > 0) && (
        <div className="ch-bulk ch-bulk-bar" role="region" aria-label="Selection">
          <span className="mn">{picked.size} selected</span>
          <button className="btn" onClick={() => own.mutate([...picked])}>Own</button>
          <button className="btn" onClick={() => unown.mutate([...picked])}>Not owned</button>
          <button className="btn" onClick={() => wishMany.mutate({ ids: [...picked], wished: true })}>Wishlist</button>
          <button className="btn" onClick={() => wishMany.mutate({ ids: [...picked], wished: false })}>Off the wishlist</button>
          <button className="btn" onClick={() => setQuick(pickedCards.flatMap((c) => (c.entry ? [c.entry.id] : [])))}>Make goals</button>
          <button className="btn" disabled={startMany.isPending} onClick={() => startMany.mutate(pickedCards.filter((c) => c.owned && !c.build).map((c) => c.id))}>
            Start builds
          </button>
          <select
            aria-label="Build status"
            value=""
            disabled={setBuildStatus.isPending || !pickedCards.some((c) => c.build)}
            onChange={(e) => e.target.value && setBuildStatus.mutate({ ids: pickedCards.flatMap((c) => (c.build ? [c.build.id] : [])), buildStatus: e.target.value as BuildStatus })}
          >
            <option value="">Build status…</option>
            <option value="none">Unbuilt</option>
            <option value="building">Building</option>
            <option value="good">Good</option>
            <option value="perfect">Perfect</option>
          </select>
          <span className="ch-sp" />
          <button className="btn ghost" onClick={() => setPicked(new Set(filtered.filter((c) => c.entry).map((c) => c.id)))}>All shown</button>
          <button className="btn ghost" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}
      <div className="ch-more">
        <span className="mu">
          {filtered.length}
        </span>
      </div>
        </>
      )}
    </>
  );
}
