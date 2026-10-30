import { useState, type CSSProperties } from "react";
import { Rarity } from "../components/Rarity";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LIMITS,
  elementColor,
  CharacterBuild,
  cardStatLabels,
  cardStatOptions,
  dupeLetter,
  featuredWithin,
  getGame,
  pullsFor,
  weaponHolder,
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
import { Chips, Segmented, TagIcon } from "../components/ui";

import { BuildsTable } from "../components/characters/BuildsTable";
import { CardStats } from "../components/characters/CardStats";
import { QuickBuild } from "../components/tasks/QuickBuild";
import type { InstanceDetail } from "../lib/types";
import { fitsOwnershipView, OwnershipFilter, type OwnershipView } from "../components/OwnershipFilter";
import { nextWriteOrder, useLatestWriteQueue } from "../lib/latestWrite";
import { LastSeenChip, lastSeenSortKey, useUnitAppearances } from "../components/LastSeen";

type CardStatsPick = { cardStats: string[] | null; cardStatsOrder: ReturnType<typeof nextWriteOrder> };

const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [element, setElement] = useState("");
  const [weapon, setWeapon] = useState("");
  const [rarity, setRarity] = useState("");
  const [ownershipView, setOwnershipView] = useState<OwnershipView>("all");
  // A dupe count picked (round 11), as text for the chips; empty for any.
  const [dupeCount, setDupeCount] = useState("");
  const [sort, setSort] = useState<"owned" | "name" | "rarity" | "level" | "lastSeen">("owned");
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
  const appearances = useUnitAppearances(instance.data?.gameKey);
  const { catalog, index, isLoading: catalogLoading } = useCatalog(instance.data?.gameKey);

  // The cache takes what was saved at once, then refetches: the cards flip on the answer, not on a refetch that can lag.
  const markOwned = (ids: string[], owned: boolean) => {
    queryClient.setQueryData<OwnershipDto[]>(["ownership", id], (old = []) => [
      ...old.filter((ownedItem) => !(ownedItem.kind === "character" && ids.includes(ownedItem.catalogId))),
      ...(owned ? ids.map((catalogId) => ({ kind: "character" as const, catalogId, qty: 1, meta: null })) : []),
    ]);
    return queryClient.invalidateQueries({ queryKey: ["ownership", id] });
  };
  const own = useMutation({
    mutationFn: (ids: string[]) => api.put(`/api/instances/${id}/ownership`, { items: ids.map((catalogId) => ({ kind: "character", catalogId, owned: true })) }),
    onSuccess: (_response, ids) => markOwned(ids, true),
  });
  const unown = useMutation({
    mutationFn: (ids: string[]) => api.put(`/api/instances/${id}/ownership`, { items: ids.map((catalogId) => ({ kind: "character", catalogId, owned: false })) }),
    onSuccess: (_response, ids) => markOwned(ids, false),
  });
  const wishMany = useMutation({
    mutationFn: (change: { ids: string[]; wished: boolean }) => Promise.all(change.ids.map((catalogId) => api.put(`/api/instances/${id}/wishlist`, { kind: "character", catalogId, wished: change.wished }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist", id] }),
  });
  // Ownership is the owned list alone: a build stays when its character is marked not owned (Georges, round 6).
  const startMany = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((catalogId) => api.post(`/api/instances/${id}/characters`, { catalogId }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["characters", id] }),
  });
  const wish = useMutation({
    mutationFn: (change: { catalogId: string; wished: boolean; kind?: "character" | "weapon" }) => api.put(`/api/instances/${id}/wishlist`, { kind: "character", ...change }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist", id] }),
  });
  // A card's own stats (Georges, round 6: "I can choose for each one character what I want to show"), saved per build, the latest pick
  // waiting while one is in flight, read back after the last.
  const buildStatsWrites = useLatestWriteQueue<CardStatsPick>(
    (buildId, pick) => api.put(`/api/characters/${buildId}`, pick),
    () => queryClient.invalidateQueries({ queryKey: ["characters"] }),
  );
  const saveBuildStats = (buildId: string, cardStats: string[] | null) => {
    void queryClient.cancelQueries({ queryKey: ["characters", id] });
    queryClient.setQueryData<CharacterDto[]>(["characters", id], (old) => old?.map((build) => (build.id === buildId ? { ...build, cardStats } : build)));
    buildStatsWrites.push(buildId, { cardStats, cardStatsOrder: nextWriteOrder() });
  };
  const start = useMutation({
    mutationFn: (request: string | { name: string } | { catalogId: string; own: false }) => api.post<{ id: string }>(`/api/instances/${id}/characters`, typeof request === "string" ? { catalogId: request } : request),
    onSuccess: (created) => navigate(`/characters/${created.id}`),
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError || builds.isError) return <LoadError what="Characters" retry={() => Promise.all([instance.refetch(), builds.refetch()])} />;
  // A game with a catalog waits for it: without it the page would fall back to one card per build.
  if (!instance.data || !builds.data || !game || catalogLoading) return <div className="text-muted">Loading…</div>;

  // Each unit's card shows its default build (the flagged one, else its first).
  const byCatalog = new Map<string, CharacterDto>();
  for (const build of builds.data) if (build.catalogId && (build.isDefault || !byCatalog.has(build.catalogId))) byCatalog.set(build.catalogId, build);
  const ownedIds = new Set((ownership.data ?? []).filter((ownedItem) => ownedItem.kind === "character").map((ownedItem) => ownedItem.catalogId));
  const wishedIds = new Set((wishlist.data ?? []).filter((wishedItem) => wishedItem.kind === "character").map((wishedItem) => wishedItem.catalogId));
  const cards: Card[] = catalog
    ? catalog.characters.map((character) => ({ id: character.id, name: character.name, rarity: character.rarity, tag: character.tag ?? null, weaponType: character.weaponType ?? null, icon: character.icon, splash: character.splash, entry: character, build: byCatalog.get(character.id), owned: ownedIds.has(character.id), wished: wishedIds.has(character.id) }))
    : builds.data.map((build) => ({ id: build.id, name: build.name, rarity: null, tag: null, weaponType: null, icon: undefined, entry: undefined, build, owned: true, wished: false }));

  const live = (dash.data?.timeline.banners ?? []).filter((banner) => banner.gameKey === game.key && banner.status === "active" && banner.kind === "character");
  const characterBanner = pulls.data?.banners.find((banner) => banner.key === "character");
  const available = pullsFor(game.currencies.filter((currency) => currency.pullCost).map((currency) => ({ ...currency, value: instance.data.currencies.find((held) => held.key === currency.key)?.value ?? 0 }))).limited;
  const eventStep = (catalogId: string) =>
    (rewards.data ?? [])
      .filter((reward) => reward.instanceId === id && reward.goal && !reward.goal.claimed)
      .flatMap((reward) => reward.options[reward.goal!.choice ?? 0]?.changes ?? [])
      .find((change) => change.catalogId === catalogId);

  const level = (card: Card) => Number((card.build?.doc as { level?: number } | undefined)?.level ?? 0);
  // A card's dupes from its build's sheet (none typed reads 0), by the game's own field (Star Rail's eidolon).
  const characterDupes = game.manifest.dupes.character;
  const dupesOf = (card: Card) => Number((card.build?.doc as Record<string, unknown> | undefined)?.[characterDupes.field] ?? 0);
  const filtered = cards
    .filter((card) => !query || card.name.toLowerCase().includes(query.toLowerCase()))
    .filter((card) => !element || card.tag === element)
    .filter((card) => !weapon || card.weaponType === weapon)
    .filter((card) => !rarity || String(card.rarity) === rarity)
    .filter((card) => fitsOwnershipView(ownershipView, card))
    .filter((card) => !dupeCount || (card.owned && dupesOf(card) === Number(dupeCount)))
    .sort((first, second) =>
      sort === "name"
        ? first.name.localeCompare(second.name)
        : sort === "rarity"
          ? (second.rarity ?? 0) - (first.rarity ?? 0) || first.name.localeCompare(second.name)
          : sort === "level"
            ? level(second) - level(first) || first.name.localeCompare(second.name)
            : sort === "lastSeen"
              ? lastSeenSortKey(appearances.data?.[first.id]) - lastSeenSortKey(appearances.data?.[second.id]) || first.name.localeCompare(second.name)
              : // Built characters first: owned, then with a build; wishlisted before the rest (the build status left the page in round 26).
              Number(second.owned) - Number(first.owned) || Number(Boolean(second.build)) - Number(Boolean(first.build)) || Number(second.wished) - Number(first.wished) || first.name.localeCompare(second.name),
    );
  const options = (pick: (card: Card) => string | null) => [...new Set(cards.map(pick).filter((value): value is string => Boolean(value)))].sort();
  const unownedShown = filtered.filter((card) => !card.owned && card.entry).map((card) => card.id);

  const togglePick = (catalogId: string) =>
    setPicked((previous) => {
      const next = new Set(previous);
      if (next.has(catalogId)) next.delete(catalogId);
      else next.add(catalogId);
      return next;
    });
  const pickedCards = cards.filter((card) => picked.has(card.id));
  // A build's weapon as the card shows it: the catalog's name and icon, its level and refinement.
  const heldOf = (build: CharacterDto | undefined) => {
    const held = build && holder ? ((build.doc as Record<string, unknown>)[holder] as Record<string, unknown> | undefined) : undefined;
    const heldWeapon = held?.catalogId ? catalog?.weapons.find((candidate) => candidate.id === held.catalogId) : undefined;
    if (!held || (!heldWeapon && !held.name)) return null;
    const dupe = dupeField ? held[dupeField.split(".").at(-1)!] : undefined;
    const level = typeof held.level === "number" ? held.level : null;
    const rank = `${dupeLetter(dupeField ?? "")}${typeof dupe === "number" ? dupe : 1}`;
    return { name: heldWeapon?.name ?? String(held.name), icon: heldWeapon?.icon, level, rank };
  };
  const holder = weaponHolder(game);
  const dupeField = game.manifest.dupes.weapon?.field;
  const gearSets = new Map((catalog?.gear ?? []).map((gearSet) => [gearSet.name, gearSet]));
  // The game's own card stats (set through its API) stand where a build picked none; the page-level pick row went in round 24
  // (Georges: "i don't really need to filter by card stat"): each card picks its own.
  const cardStats = instance.data.cardStats ?? null;
  const statOptions = cardStatOptions(game, builds.data.map((build) => build.doc as Record<string, unknown>));

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={instance.data.id} active="characters" gameKey={game.key} />
      </div>
      <section className="card ch-filters" aria-label="Filters">
        <label>
          Search
          <input type="search" aria-label="Search" placeholder="Name" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        {catalog && (
          <>
            <Chips label="Element" value={element} onChange={setElement} options={options((card) => (card.tag === "None" ? null : card.tag))} color={(tag) => elementColor(game.key, tag)} icons={{ gameKey: game.key, kind: "element" }} />
            <Chips label="Weapon" value={weapon} onChange={setWeapon} options={options((card) => card.weaponType)} icons={{ gameKey: game.key, kind: "weapon-type" }} />
            <Chips label="Rarity" value={rarity} onChange={setRarity} options={options((card) => (card.rarity ? String(card.rarity) : null)).reverse()} text={(rarityValue) => `★${rarityValue}`} />
            <Chips label={characterDupes.label} value={dupeCount} onChange={setDupeCount} options={Array.from({ length: characterDupes.max + 1 }, (_, count) => String(count))} text={(count) => `${dupeLetter(characterDupes.field)}${count}`} />
          </>
        )}
        <label>
          Sort
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="owned">Owned first</option>
            <option value="name">Name</option>
            <option value="rarity">Rarity</option>
            <option value="level">Level</option>
            <option value="lastSeen">Last seen</option>
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
      </section>

      {kind === "builds" ? (
        <BuildsTable instanceId={id!} game={game} builds={builds.data.filter((build) => !query || build.name.toLowerCase().includes(query.toLowerCase()))} entryOf={(catalogId) => (catalogId ? catalog?.characters.find((character) => character.id === catalogId) : undefined)} />
      ) : (
        <>

      <div className="ch-counts" role="group" aria-label="Filter by count">
        {/* One screen for every character, owned or not (round 9), filtered by ownership (round 11). */}
        <OwnershipFilter
          view={ownershipView}
          counts={{
            all: cards.length,
            owned: cards.filter((card) => card.owned).length,
            notOwned: cards.filter((card) => !card.owned).length,
            ...(catalog ? { wishlist: cards.filter((card) => card.wished).length } : {}),
          }}
          onChange={setOwnershipView}
        />
        {!catalog && (
          <form
            className="row"
            onSubmit={(event) => {
              event.preventDefault();
              if (newName.trim()) start.mutate({ name: newName.trim() });
            }}
          >
            <input aria-label="Character name" placeholder="Character name" value={newName} onChange={(event) => setNewName(event.target.value)} />
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
        {filtered.map((card) => {
          const doc = (card.build?.doc ?? {}) as Record<string, unknown>;
          const build = new CharacterBuild(game, doc);
          const onBanner = live.find((banner) => banner.featured.some((featuredUnit) => featuredUnit.catalogId === card.id));
          const step = eventStep(card.id);
          const art = splashKey(game.key, card.icon, card.splash);
          const elementTint = elementColor(game.key, card.tag);
          const held = heldOf(card.build);
          // The whole card opens the build, or the unit's page when there is none.
          const to = card.build ? `/characters/${card.build.id}` : card.entry ? `/games/${id}/units/${card.id}` : null;
          return (
            <article key={card.id} className={`ch-card ${selecting && picked.has(card.id) ? "is-picked" : ""}`} data-game={game.key} aria-label={card.name} style={elementTint ? ({ "--el": elementTint } as CSSProperties) : undefined}>
              {selecting && card.entry ? (
                <label className="ch-open ch-picking">
                  <input type="checkbox" className="ch-pick" aria-label={`Select ${card.name}`} checked={picked.has(card.id)} onChange={() => togglePick(card.id)} />
                </label>
              ) : (
                to && <Link to={to} className="ch-open" aria-label={`Open ${card.name}`} />
              )}
              <div className="ch-art">
                <GameIcon
                  src={card.build?.portraitUrl ?? assetUrl(game.key, "splash", art)}
                  fallback={[communityAssetUrl(game.key, "splash", art), communityAssetUrl(game.key, "character", card.icon)]}
                  alt={card.name}
                  glyph="character"
                />
                {/* Rarity, weapon type, element: three tiles of one size down the left edge (round 26, Georges: "all 3 stacked on top of each other"). */}
                <div className="ch-chips">
                  <Rarity value={card.rarity} className="badge ch-tile" />
                  {card.weaponType && (
                    <span className="badge ch-tile" role="img" aria-label={card.weaponType} title={card.weaponType}>
                      <TagIcon gameKey={game.key} kind="weapon-type" name={card.weaponType} fallback={<span className="ch-tile-text">{card.weaponType.slice(0, 3)}</span>} />
                    </span>
                  )}
                  {card.tag && card.tag !== "None" && (
                    <span className="badge ch-tile ch-el" role="img" aria-label={card.tag} title={card.tag}>
                      <TagIcon gameKey={game.key} kind="element" name={card.tag} fallback={<span className="ch-tile-text">{card.tag.slice(0, 3)}</span>} />
                    </span>
                  )}
                </div>
                <span className={`ch-dupes ${card.owned ? "" : "is-off"}`}>{card.owned ? build.dupeBadge : "Not owned"}</span>
                <div className="ch-namebox">
                  <div className="ch-namebox-text">
                    <h3>{card.name}</h3>
                    <div className="font-mono ch-namebox-line">
                      {card.build ? build.line(card.entry?.talents.keys ?? [], !held) : onBanner ? `on the banner until ${ENDS.format(new Date(onBanner.endsAt))}` : card.owned ? "no build yet" : "not owned"}
                    </div>
                  </div>
                  {/* Its weapon on the name card (Georges, round 4), on the right, its level top-left and refinement bottom-right (round 5). */}
                  {held && (
                    <span className="ch-weapon" title={[held.name, held.level !== null && `Lv ${held.level}`, held.rank].filter(Boolean).join(" · ")}>
                      <GameIcon src={assetUrl(game.key, "weapon", held.icon)} fallback={communityAssetUrl(game.key, "weapon", held.icon)} alt={held.name} glyph="weapon" />
                      {held.level !== null && <span className="font-mono ch-weapon-lv">{held.level}</span>}
                      <span className="font-mono ch-weapon-r">{held.rank}</span>
                    </span>
                  )}
                </div>
              </div>
              {card.build ? (
                <CardStats
                  name={card.name}
                  options={statOptions}
                  kpis={build.statKpis(cardStatLabels(game, card.entry, card.build.role, card.build.cardStats, cardStats), catalog?.gear ?? [], build.baseStats(index, card.build.catalogId))}
                  own={card.build.cardStats}
                  growth={card.entry?.bonusStats?.[0]}
                  onPick={(stats) => saveBuildStats(card.build!.id, stats)}
                />
              ) : card.entry && !(!card.owned && onBanner && characterBanner) ? (
                // No build yet: the character's own data, its base stats at its top level, its growth stat first (Georges, round 7).
                <CardStats
                  name={card.name}
                  options={[]}
                  own={null}
                  growth={card.entry.bonusStats?.[0]}
                  baseNote={`Base at Lv ${card.entry.maxLevel}`}
                  kpis={new CharacterBuild(game, {}).statKpis([...new Set([...(card.entry.bonusStats?.slice(0, 1) ?? []), "HP", "ATK", "DEF"])].slice(0, LIMITS.cardStats), [], new CharacterBuild(game, { level: card.entry.maxLevel }).baseStats(index, card.entry.id))}
                />
              ) : !card.owned && onBanner && characterBanner ? (
                <div className="ch-kpis ch-chance">
                  <div>
                    <span className="kpi-label">Chance with your {available} pulls</span>
                    <span className="font-display">{Math.round(featuredWithin(characterBanner, characterBanner.state, available) * 100)}%{characterBanner.state.guaranteed ? " · guaranteed" : ""}</span>
                  </div>
                </div>
              ) : null}
              <div className="ch-foot">
                {card.build && (
                  <span className="text-muted ch-set">
                    {/* The completed sets as their icons with their counts (Georges, round 6), the role where none is. */}
                    {build.completedSets.map((completedSet) => {
                      const set = gearSets.get(completedSet.name);
                      return (
                        <span key={completedSet.name} className="ch-set-icon" title={`${completedSet.name} ${completedSet.size}pc`}>
                          <CatalogIcon gameKey={game.key} kind="gear" icon={set?.icon} name={completedSet.name} />
                          <b className="font-mono">{completedSet.size}</b>
                        </span>
                      );
                    })}
                    {build.completedSets.length === 0 && (card.build.role ?? "")}
                  </span>
                )}
                {step && <span className="badge todo">→ {step.letter}{step.to} · event</span>}
                <LastSeenChip appearance={appearances.data?.[card.id]} />
                <span className="ch-sp" />
                {/* A build to try, owned or not (round 9). */}
                {!card.build && !card.owned && onBanner && <Link to={`/games/${id}/pulls`}>Plan pulls →</Link>}
                {!card.build && (card.owned || card.entry) && (
                  <button className="btn ghost" disabled={start.isPending} onClick={() => start.mutate(card.owned ? card.id : { catalogId: card.id, own: false })}>
                    Start a build
                  </button>
                )}
              </div>
              {!card.owned && card.entry && (
                <div className="ch-own">
                  <button className="btn" onClick={() => own.mutate([card.id])}>Own</button>
                  <button className="btn" aria-pressed={card.wished} onClick={() => wish.mutate({ catalogId: card.id, wished: !card.wished })}>Wishlist</button>
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
          <span className="font-mono">{picked.size} selected</span>
          <button className="btn" onClick={() => own.mutate([...picked])}>Own</button>
          <button className="btn" onClick={() => unown.mutate([...picked])}>Not owned</button>
          <button className="btn" onClick={() => wishMany.mutate({ ids: [...picked], wished: true })}>Wishlist</button>
          <button className="btn" onClick={() => wishMany.mutate({ ids: [...picked], wished: false })}>Off the wishlist</button>
          <button className="btn" onClick={() => setQuick(pickedCards.flatMap((pickedCard) => (pickedCard.entry ? [pickedCard.entry.id] : [])))}>Make goals</button>
          <button className="btn" disabled={startMany.isPending} onClick={() => startMany.mutate(pickedCards.filter((pickedCard) => pickedCard.owned && !pickedCard.build).map((pickedCard) => pickedCard.id))}>
            Start builds
          </button>
          <span className="ch-sp" />
          <button className="btn ghost" onClick={() => setPicked(new Set(filtered.filter((card) => card.entry).map((card) => card.id)))}>All shown</button>
          <button className="btn ghost" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}
      <div className="ch-more">
        <span className="text-muted">
          {filtered.length}
        </span>
      </div>
        </>
      )}
    </>
  );
}
