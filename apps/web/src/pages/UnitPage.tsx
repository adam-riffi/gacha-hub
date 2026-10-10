import type { CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { elementColor, featuredWithin, getGame, pullsFor, type CharacterDto, type DashboardDto, type OwnershipDto, type PullLogDto, type WishlistItemDto } from "@gacha/shared";
import { LoadError } from "../components/LoadError";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { assetUrl, communityAssetUrl, splashKey } from "../lib/assets";

import { GameTabs } from "../components/GameTabs";
import { GameIcon } from "../components/GameIcon";
import { TaskGeneratorPanel } from "../components/TaskGeneratorPanel";
import type { InstanceDetail } from "../lib/types";

const DATE = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

/**
 * A unit from the game's catalog (Georges, 2026-10-10: every character opens,
 * owned or not): its art and facts tinted to its element, owning and the
 * wishlist, its builds or Start a build, the banners that feature it with
 * your chance, what each dupe does, and plan farming before you own it.
 */
export function UnitPage() {
  const { id, catalogId } = useParams<{ id: string; catalogId: string }>();
  const qc = useQueryClient();
  const nav = useNavigate();
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => api.get<InstanceDetail>(`/api/instances/${id}`) });
  const builds = useQuery({ queryKey: ["characters", id], queryFn: () => api.get<CharacterDto[]>(`/api/instances/${id}/characters`) });
  const ownership = useQuery({ queryKey: ["ownership", id], queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${id}/ownership`) });
  const wishlist = useQuery({ queryKey: ["wishlist", id], queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${id}/wishlist`) });
  const pulls = useQuery({ queryKey: ["pulls", id], queryFn: () => api.get<PullLogDto>(`/api/instances/${id}/pulls`) });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardDto>("/api/dashboard") });
  const { index } = useCatalog(instance.data?.gameKey);
  const own = useMutation({
    mutationFn: (owned: boolean) => api.put(`/api/instances/${id}/ownership`, { items: [{ kind: "character", catalogId, owned }] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ownership", id] }),
  });
  const wish = useMutation({
    mutationFn: (wished: boolean) => api.put(`/api/instances/${id}/wishlist`, { kind: "character", catalogId, wished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist", id] }),
  });
  const start = useMutation({
    mutationFn: () => api.post<{ id: string }>(`/api/instances/${id}/characters`, { catalogId }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["characters", id] });
      nav(`/characters/${r.id}`);
    },
  });

  const game = instance.data && getGame(instance.data.gameKey);
  if (instance.isError) return <LoadError what="This unit" retry={() => instance.refetch()} />;
  if (!instance.data || !game || !index) return <div className="mu">Loading…</div>;
  const entry = index.characters.get(catalogId ?? "");
  if (!entry) {
    return (
      <p className="mu">
        No unit {catalogId} in {game.name}&apos;s catalog. <Link to={`/games/${id}/characters`}>← Characters</Link>
      </p>
    );
  }

  const mine = (builds.data ?? []).filter((b) => b.catalogId === entry.id);
  const owned = mine.length > 0 || (ownership.data ?? []).some((o) => o.kind === "character" && o.catalogId === entry.id);
  const wished = (wishlist.data ?? []).some((w) => w.kind === "character" && w.catalogId === entry.id);
  const banners = (dash.data?.timeline.banners ?? []).filter((b) => b.gameKey === game.key && b.status !== "ended" && b.featured.some((f) => f.catalogId === entry.id));
  const rules = pulls.data?.banners.find((b) => b.key === "character");
  const available = pullsFor(game.currencies.filter((c) => c.pullCost).map((c) => ({ ...c, value: instance.data.currencies.find((x) => x.key === c.key)?.value ?? 0 }))).limited;
  const art = splashKey(game.key, entry.icon, entry.splash);
  const el = elementColor(game.key, entry.tag);
  const dupe = game.manifest.dupes.character;

  return (
    <div className="un-page" style={el ? ({ "--el": el } as CSSProperties) : undefined}>
      <div style={{ marginBottom: 14 }}>
        <GameTabs instanceId={id!} active="characters" gameKey={game.key} hasCatalog />
      </div>
      <div className="sh-top">
        <div className="sh-art un-art">
          <GameIcon src={assetUrl(game.key, "splash", art)} fallback={[communityAssetUrl(game.key, "splash", art), communityAssetUrl(game.key, "character", entry.icon)]} alt={entry.name} label={entry.name.slice(0, 2)} />
        </div>
        <div className="sh-main">
          <section className="card sh-head">
            <div className="spread">
              <Link to={`/games/${id}/characters`}>← Characters</Link>
              <div className="row">
                <button className="btn" aria-pressed={owned} disabled={own.isPending || mine.length > 0} onClick={() => own.mutate(!owned)}>
                  {owned ? "Owned" : "Own"}
                </button>
                <button className="btn" aria-pressed={wished} disabled={wish.isPending} onClick={() => wish.mutate(!wished)}>
                  Wishlist
                </button>
                {owned && (
                  <button className="btn primary" disabled={start.isPending} onClick={() => start.mutate()}>
                    {mine.length ? "+ Another build" : "Start a build"}
                  </button>
                )}
              </div>
            </div>
            <div className="sh-title un-title">
              <h1>{entry.name}</h1>
              <span className="badge">★{entry.rarity}</span>
              {entry.tag && entry.tag !== "None" && <span className="badge un-el">{entry.tag}</span>}
              {entry.weaponType && <span className="badge">{entry.weaponType}</span>}
              <span className="badge">Lv max {entry.maxLevel}</span>
            </div>
          </section>

          <div className="sh-cards un-cards">
            <section className="card" aria-label="Builds">
              <h3>Builds</h3>
              {mine.map((b) => (
                <div className="sh-row" key={b.id}>
                  <Link to={`/characters/${b.id}`}>{b.name}</Link>
                  <span className="badge">{b.buildStatus === "none" ? "Unbuilt" : b.buildStatus}</span>
                </div>
              ))}
              {mine.length === 0 && <p className="mu">{owned ? "No build" : "Not owned"}</p>}
            </section>
            <section className="card" aria-label="Banners">
              <h3>Banners</h3>
              {banners.map((b) => (
                <div className="sh-row" key={b.id}>
                  <span>
                    {b.name} <span className="mu">· {b.status === "active" ? `until ${DATE.format(new Date(b.endsAt))}` : `from ${DATE.format(new Date(b.startsAt))}`}</span>
                  </span>
                  {rules && b.status === "active" && !owned && <span className="mn">{Math.round(featuredWithin(rules, rules.state, available) * 100)}% with your {available} pulls</span>}
                </div>
              ))}
              {banners.length === 0 && <p className="mu">None</p>}
              <Link to={`/games/${id}/pulls`}>Pulls</Link> · <Link to="/timeline">Banners</Link>
            </section>
          </div>

          {(entry.constellations?.length ?? 0) > 0 && (
            <section className="card" aria-label={dupe.label}>
              <h3>{dupe.label}</h3>
              <ol className="un-dupes">
                {entry.constellations!.map((c, i) => (
                  <li key={i}>
                    <strong>{c.name ?? `${dupe.label} ${i + 1}`}</strong> <span className="mu">{c.description}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>

      <section className="card sh-plan" aria-label="Plan farming">
        <TaskGeneratorPanel instanceId={id!} gameKey={game.key} catalogId={entry.id} doc={(mine[0]?.doc as Record<string, unknown> | undefined) ?? {}} />
      </section>
    </div>
  );
}
