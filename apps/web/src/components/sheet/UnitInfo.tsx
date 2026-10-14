import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { featuredWithin, pullsFor, type CatalogCharacter, type GameDefinition, type OwnershipDto, type PullLogDto, type WishlistItemDto } from "@gacha/shared";
import { api } from "../../lib/api";
import type { InstanceDetail } from "../../lib/types";
import { timeAgo, useUnitAppearances } from "../LastSeen";

const BANNER_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const useOwned = (instanceId: string, catalogId: string) => {
  const ownership = useQuery({ queryKey: ["ownership", instanceId], queryFn: () => api.get<OwnershipDto[]>(`/api/instances/${instanceId}/ownership`) });
  return (ownership.data ?? []).some((ownedUnit) => ownedUnit.kind === "character" && ownedUnit.catalogId === catalogId);
};

/** Owning and the wishlist, on every character's sheet (round 10): a build to try leaves its character unowned. */
export function UnitToggles({ instanceId, catalogId }: { instanceId: string; catalogId: string }) {
  const queryClient = useQueryClient();
  const owned = useOwned(instanceId, catalogId);
  const wishlist = useQuery({ queryKey: ["wishlist", instanceId], queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${instanceId}/wishlist`) });
  const wished = (wishlist.data ?? []).some((wishedItem) => wishedItem.kind === "character" && wishedItem.catalogId === catalogId);
  const setOwned = useMutation({
    mutationFn: (nextOwned: boolean) => api.put(`/api/instances/${instanceId}/ownership`, { items: [{ kind: "character", catalogId, owned: nextOwned }] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ownership", instanceId] }),
  });
  const setWished = useMutation({
    mutationFn: (nextWished: boolean) => api.put(`/api/instances/${instanceId}/wishlist`, { kind: "character", catalogId, wished: nextWished }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist", instanceId] }),
  });
  return (
    <span className="row un-toggles">
      <button type="button" className="btn" aria-pressed={owned} disabled={setOwned.isPending} onClick={() => setOwned.mutate(!owned)}>
        {owned ? "Owned" : "Own"}
      </button>
      <button type="button" className="btn" aria-pressed={wished} disabled={setWished.isPending} onClick={() => setWished.mutate(!wished)}>
        Wishlist
      </button>
    </span>
  );
}

/** One fact of the banners card: its label above, its value large, its detail below. */
function BannerFact({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="un-banner-fact">
      <span className="kpi-label">{label}</span>
      <span className="cd un-banner-fact-value">{value}</span>
      {detail && <span className="mu">{detail}</span>}
    </div>
  );
}

/**
 * The unit's banners across the sheet (Georges, round 11: "there's a wild banner card on the character screen"; "I'd like a 'last
 * seen' info to characters to see their last banners"): the one on now with your chance, the next, the last seen and the runs,
 * then every banner it was on; and what each dupe does.
 */
export function UnitInfo({ instance, game, entry }: { instance: InstanceDetail; game: GameDefinition; entry: CatalogCharacter }) {
  const owned = useOwned(instance.id, entry.id);
  const pulls = useQuery({ queryKey: ["pulls", instance.id], queryFn: () => api.get<PullLogDto>(`/api/instances/${instance.id}/pulls`) });
  const appearance = useUnitAppearances(game.key).data?.[entry.id];
  const characterBannerRules = pulls.data?.banners.find((bannerRules) => bannerRules.key === "character");
  const limitedPullsAvailable = pullsFor(game.currencies.filter((currency) => currency.pullCost).map((currency) => ({ ...currency, value: instance.currencies.find((held) => held.key === currency.key)?.value ?? 0 }))).limited;
  const dupe = game.manifest.dupes.character;
  // The time the sheet opened, so the render stays pure.
  const [nowTime] = useState(() => Date.now());
  return (
    <>
      <section className="card un-banners" aria-label="Banners">
        <div className="spread">
          <h3>Banners</h3>
          <span className="row">
            <Link to={`/games/${instance.id}/pulls`}>Pulls</Link>
            <Link to="/timeline">Timeline</Link>
          </span>
        </div>
        <div className="un-banner-facts">
          <BannerFact
            label="On now"
            value={appearance?.current ? appearance.current.name : "—"}
            detail={
              appearance?.current &&
              `until ${BANNER_DATE.format(new Date(appearance.current.endsAt))}${characterBannerRules && !owned ? ` · ${Math.round(featuredWithin(characterBannerRules, characterBannerRules.state, limitedPullsAvailable) * 100)}% with your ${limitedPullsAvailable} pulls` : ""}`
            }
          />
          <BannerFact label="Next" value={appearance?.next ? appearance.next.name : "—"} detail={appearance?.next && `from ${BANNER_DATE.format(new Date(appearance.next.startsAt))}`} />
          <BannerFact
            label="Last seen"
            value={appearance?.lastEnded ? timeAgo(appearance.lastEnded.endsAt, nowTime) : "—"}
            detail={appearance?.lastEnded && `${appearance.lastEnded.name} · ended ${BANNER_DATE.format(new Date(appearance.lastEnded.endsAt))}`}
          />
          <BannerFact label="Runs" value={appearance?.runs ?? 0} />
        </div>
        {appearance && appearance.history.length > 0 && (
          <table className="un-banner-history">
            <thead>
              <tr>
                <th>Banner</th>
                <th>From</th>
                <th>To</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {appearance.history.map((banner) => {
                const started = Date.parse(banner.startsAt) <= nowTime;
                const ended = Date.parse(banner.endsAt) <= nowTime;
                return (
                  <tr key={banner.key}>
                    <td>{banner.name}</td>
                    <td className="mn">{BANNER_DATE.format(new Date(banner.startsAt))}</td>
                    <td className="mn">{BANNER_DATE.format(new Date(banner.endsAt))}</td>
                    <td className="mn">{ended ? timeAgo(banner.endsAt, nowTime) : started ? "now" : "next"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      {(entry.constellations?.length ?? 0) > 0 && (
        <section className="card un-dupes-card" aria-label={dupe.label}>
          <h3>{dupe.label}</h3>
          <ol className="un-dupes">
            {entry.constellations!.map((constellation, index) => (
              <li key={index}>
                <strong>{constellation.name ?? `${dupe.label} ${index + 1}`}</strong> <span className="mu">{constellation.description}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
