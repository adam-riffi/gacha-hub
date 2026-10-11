import { useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  elementColor,
  buildKpis,
  buildLine,
  dupeBadge,
  dupeLetter,
  featuredWithin,
  gearSetLabel,
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
import { GameIcon } from "../components/GameIcon";
import { Chips, Segmented } from "../components/ui";

import { BuildsTable } from "../components/characters/BuildsTable";
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
  // Several units at once (Georges, 2026-10-10): Select shows a box on each card.
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");

  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const ownership = useQuery({ queryKey: ["ownership", id], queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${id}/ownership`) });
  const wishlist = useQuery({ queryKey: ["wishlist", id], queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${id}/wishlist`) });
  const pulls = useQuery({ queryKey: ["pulls", id], queryFn: () => api.get<PullLogDto>(`/api/instances/${id}/pulls`) });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardDto>("/api/dashboard") });
  const rewards = useQuery({ queryKey: ["rewards"], queryFn: () => api.get<RewardDto[]>("/api/rewards") });
  const { catalog, isLoading: catalogLoading } = useCatalog(instance.data?.gameKey);

  const own = useMutation({
    mutationFn: (ids: string[]) => api.put(`/api/instances/${id}/ownership`, { items: ids.map((catalogId) => ({ kind: "character", catalogId, owned: true })) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ownership", id] }),
  });
  const unown = useMutation({
    mutationFn: (ids: string[]) => api.put(`/api/instances/${id}/ownership`, { items: ids.map((catalogId) => ({ kind: "character", catalogId, owned: false })) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ownership", id] }),
  });
  const wishMany = useMutation({
    mutationFn: (v: { ids: string[]; wished: boolean }) => Promise.all(v.ids.map((catalogId) => api.put(`/api/instances/${id}/wishlist`, { kind: "character", catalogId, wished: v.wished }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist", id] }),
  });
  const startMany = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((catalogId) => api.post(`/api/instances/${id}/characters`, { catalogId }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters", id] }),
  });
  const wish = useMutation({
    mutationFn: (v: { catalogId: string; wished: boolean; kind?: "character" | "weapon" }) => api.put(`/api/instances/${id}/wishlist`, { kind: "character", ...v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist", id] }),
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
    ? catalog.characters.map((c) => ({ id: c.id, name: c.name, rarity: c.rarity, tag: c.tag ?? null, weaponType: c.weaponType ?? null, icon: c.icon, splash: c.splash, entry: c, build: byCatalog.get(c.id), owned: ownedIds.has(c.id) || byCatalog.has(c.id), wished: wishedIds.has(c.id) }))
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
  // A build's weapon as the card shows it: the catalog's name and icon, level and refinement.
  const heldOf = (b: CharacterDto | undefined) => {
    const held = b && holder ? ((b.doc as Record<string, unknown>)[holder] as Record<string, unknown> | undefined) : undefined;
    const w = held?.catalogId ? catalog?.weapons.find((x) => x.id === held.catalogId) : undefined;
    if (!held || (!w && !held.name)) return null;
    const dupe = dupeField ? held[dupeField.split(".").at(-1)!] : undefined;
    const level = typeof held.level === "number" ? `Lv ${held.level}` : null;
    const rank = `${dupeLetter(dupeField ?? "")}${typeof dupe === "number" ? dupe : 1}`;
    return { name: w?.name ?? String(held.name), icon: w?.icon, line: [level, rank].filter(Boolean).join(" · ") };
  };
  const holder = weaponHolder(game);
  const dupeField = game.manifest.dupes.weapon?.field;

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
          // The whole card opens the build, or the unit's page when there is none.
          const to = c.build ? `/characters/${c.build.id}` : c.entry ? `/games/${id}/units/${c.id}` : null;
          return (
            <article key={c.id} className={`ch-card ${c.owned ? "" : "is-unowned"}`} aria-label={c.name} style={el ? ({ "--el": el } as CSSProperties) : undefined}>
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
                  label={c.name.slice(0, 2)}
                />
                <div className="ch-chips">
                  {c.rarity && <span className="badge">★{c.rarity}</span>}
                  {c.tag && c.tag !== "None" && <span className="badge ch-el">{c.tag}</span>}
                  {c.weaponType && <span className="badge">{c.weaponType}</span>}
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
                {heldOf(c.build) && (
                  <span className="ch-weapon" title={heldOf(c.build)!.name}>
                    <GameIcon src={assetUrl(game.key, "weapon", heldOf(c.build)!.icon)} fallback={communityAssetUrl(game.key, "weapon", heldOf(c.build)!.icon)} alt={heldOf(c.build)!.name} label={heldOf(c.build)!.name.slice(0, 2)} />
                    <span className="mn">{heldOf(c.build)!.line}</span>
                  </span>
                )}
                {c.build && <span className={`badge ${c.build.buildStatus === "perfect" ? "done" : ""}`}>{c.build.buildStatus === "none" ? "Unbuilt" : c.build.buildStatus}</span>}
                {c.build && <span className="mu ch-set">{gearSetLabel(game, doc) ?? c.build.role ?? ""}</span>}
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
      {picked.size > 0 && (
        <div className="ch-bulk ch-bulk-bar" role="region" aria-label="Selection">
          <span className="mn">{picked.size} selected</span>
          <button className="btn" onClick={() => own.mutate([...picked])}>Own</button>
          <button className="btn" onClick={() => unown.mutate(pickedCards.filter((c) => !c.build).map((c) => c.id))}>Not owned</button>
          <button className="btn" onClick={() => wishMany.mutate({ ids: [...picked], wished: true })}>Wishlist</button>
          <button className="btn" onClick={() => wishMany.mutate({ ids: [...picked], wished: false })}>Off the wishlist</button>
          <button className="btn" disabled={startMany.isPending} onClick={() => startMany.mutate(pickedCards.filter((c) => c.owned && !c.build).map((c) => c.id))}>
            Start builds
          </button>
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
