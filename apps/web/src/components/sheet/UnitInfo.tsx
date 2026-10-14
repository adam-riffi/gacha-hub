import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  featuredWithin,
  pullsFor,
  type CatalogCharacter,
  type DashboardDto,
  type GameDefinition,
  type OwnershipDto,
  type PullLogDto,
  type WishlistItemDto,
} from "@gacha/shared";
import { api } from "../../lib/api";
import type { InstanceDetail } from "../../lib/types";

const DATE = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

const useOwned = (instanceId: string, catalogId: string) => {
  const ownership = useQuery({
    queryKey: ["ownership", instanceId],
    queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${instanceId}/ownership`),
  });
  return (ownership.data ?? []).some((o) => o.kind === "character" && o.catalogId === catalogId);
};

/** Owning and the wishlist, on every character's sheet (round 10): a build to try leaves its character unowned. */
export function UnitToggles({ instanceId, catalogId }: { instanceId: string; catalogId: string }) {
  const qc = useQueryClient();
  const owned = useOwned(instanceId, catalogId);
  const wishlist = useQuery({
    queryKey: ["wishlist", instanceId],
    queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${instanceId}/wishlist`),
  });
  const wished = (wishlist.data ?? []).some(
    (w) => w.kind === "character" && w.catalogId === catalogId,
  );
  const own = useMutation({
    mutationFn: (next: boolean) =>
      api.put(`/api/instances/${instanceId}/ownership`, {
        items: [{ kind: "character", catalogId, owned: next }],
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ownership", instanceId] }),
  });
  const wish = useMutation({
    mutationFn: (next: boolean) =>
      api.put(`/api/instances/${instanceId}/wishlist`, {
        kind: "character",
        catalogId,
        wished: next,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist", instanceId] }),
  });
  return (
    <span className="row un-toggles">
      <button
        type="button"
        className="btn"
        aria-pressed={owned}
        disabled={own.isPending}
        onClick={() => own.mutate(!owned)}
      >
        {owned ? "Owned" : "Own"}
      </button>
      <button
        type="button"
        className="btn"
        aria-pressed={wished}
        disabled={wish.isPending}
        onClick={() => wish.mutate(!wished)}
      >
        Wishlist
      </button>
    </span>
  );
}

/** The banners that feature the unit, with your chance while you do not own it, and what each dupe does. */
export function UnitInfo({
  instance,
  game,
  entry,
}: {
  instance: InstanceDetail;
  game: GameDefinition;
  entry: CatalogCharacter;
}) {
  const owned = useOwned(instance.id, entry.id);
  const pulls = useQuery({
    queryKey: ["pulls", instance.id],
    queryFn: () => api.get<PullLogDto>(`/api/instances/${instance.id}/pulls`),
  });
  const dash = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardDto>("/api/dashboard"),
  });
  const banners = (dash.data?.timeline.banners ?? []).filter(
    (b) =>
      b.gameKey === game.key &&
      b.status !== "ended" &&
      b.featured.some((f) => f.catalogId === entry.id),
  );
  const rules = pulls.data?.banners.find((b) => b.key === "character");
  const available = pullsFor(
    game.currencies
      .filter((c) => c.pullCost)
      .map((c) => ({ ...c, value: instance.currencies.find((x) => x.key === c.key)?.value ?? 0 })),
  ).limited;
  const dupe = game.manifest.dupes.character;
  return (
    <div className="sh-cards un-cards">
      <section className="card" aria-label="Banners">
        <h3>Banners</h3>
        {banners.map((b) => (
          <div className="sh-row" key={b.id}>
            <span>
              {b.name}{" "}
              <span className="mu">
                ·{" "}
                {b.status === "active"
                  ? `until ${DATE.format(new Date(b.endsAt))}`
                  : `from ${DATE.format(new Date(b.startsAt))}`}
              </span>
            </span>
            {rules && b.status === "active" && !owned && (
              <span className="mn">
                {Math.round(featuredWithin(rules, rules.state, available) * 100)}% with your{" "}
                {available} pulls
              </span>
            )}
          </div>
        ))}
        {banners.length === 0 && <p className="mu">None</p>}
        <Link to={`/games/${instance.id}/pulls`}>Pulls</Link> · <Link to="/timeline">Banners</Link>
      </section>
      {(entry.constellations?.length ?? 0) > 0 && (
        <section className="card" aria-label={dupe.label}>
          <h3>{dupe.label}</h3>
          <ol className="un-dupes">
            {entry.constellations!.map((c, i) => (
              <li key={i}>
                <strong>{c.name ?? `${dupe.label} ${i + 1}`}</strong>{" "}
                <span className="mu">{c.description}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
