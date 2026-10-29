import { useState } from "react";
import { topNames } from "../FeaturedUnits";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, rewardOptions, type RewardDto, type RosterChange, type WishlistItemDto } from "@gacha/shared";
import { api } from "../../lib/api";
import { assetUrl, communityAssetUrl, officialArt, splashKey } from "../../lib/assets";
import { FeaturedUnits } from "../FeaturedUnits";
import { GameIcon } from "../GameIcon";
import { GameMark } from "../GameMark";
import { HeroArt } from "../HeroArt";
import type { CalItem } from "../../pages/CalendarPage";

const LOCAL = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const UTC = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const KIND = { banner: "Banner", event: "Event", cycle: "Endgame cycle", pass: "Pass" } as const;
const EMPTY = { dupes: new Map<string, number>(), owned: new Set<string>(), names: new Map<string, string>() };

/** "C2 → C3", or "new → C0" for a unit not owned yet. */
export const stepText = (change: RosterChange) => `${change.from === null ? "new" : `${change.letter}${change.from}`} → ${change.letter}${change.to}`;

/** An instant in server time ("Tue 3 Nov, 23:59 · UTC+1"). */
function serverTime(instantMs: number, offsetMinutes: number) {
  const offsetHours = offsetMinutes / 60;
  return `${UTC.format(instantMs + offsetMinutes * 60_000)} · UTC${offsetHours >= 0 ? "+" : "−"}${Math.abs(offsetHours)}`;
}

/**
 * The calendar's selected item (WIREFRAMES.md A4): art (the official key art
 * when the banner or event came with one, round 16), end in your time and
 * server time, progress, and for a reward event a picker with one row per
 * choice and its effect, then Make goal and a reminder 48 h before it ends.
 */
export function CalendarSelected({ item, reward, now, onClose }: { item: CalItem | null; reward?: RewardDto; now: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [pick, setPick] = useState<number | null>(reward?.goal?.choice ?? (reward?.options.length === 1 ? 0 : null));
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["rewards"] }), queryClient.invalidateQueries({ queryKey: ["tasks"] })]);
  const makeGoal = useMutation({
    mutationFn: () => api.post(`/api/events/${reward!.eventId}/goal`, { instanceId: reward!.instanceId, ...(reward!.options.length > 1 ? { choice: pick } : {}) }),
    onSuccess: refresh,
  });
  const remind = useMutation({ mutationFn: (notify: boolean) => api.put(`/api/tasks/${reward!.goal!.id}`, { notify }), onSuccess: refresh });
  // An event or a banner goes on the wishlist by its key (Georges, 2026-10-11).
  const wishKind = item?.kind === "event" ? "event" : "banner";
  const wishKey = item?.kind === "event" ? item.event?.key : item?.kind === "banner" ? item.banners?.[0]?.key : undefined;
  const wishlist = useQuery({ queryKey: ["wishlist", item?.instanceId], queryFn: () => api.get<WishlistItemDto[]>(`/api/instances/${item!.instanceId}/wishlist`), enabled: Boolean(wishKey) });
  const wished = (wishlist.data ?? []).some((wishedItem) => wishedItem.kind === wishKind && wishedItem.catalogId === wishKey);
  const wish = useMutation({
    mutationFn: (on: boolean) => api.put(`/api/instances/${item!.instanceId}/wishlist`, { kind: wishKind, catalogId: wishKey, wished: on }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist", item!.instanceId] }),
  });

  if (!item) {
    return (
      <aside className="card cal-sel" aria-label="Selected">
        <h3>Selected</h3>
        <p className="text-muted">Pick a bar</p>
      </aside>
    );
  }

  const game = getGame(item.gameKey);
  const featured = (item.banners ?? []).flatMap((banner) => banner.featured).filter((featuredUnit) => (featuredUnit.rarity ?? 0) >= 5 || featuredUnit.kind === "character");
  const art = featured[0];
  const keyArt = [...(item.banners ?? []).map((banner) => officialArt(banner.payload)), officialArt(item.event?.payload)].find(Boolean);
  const option = pick === null ? undefined : reward?.options[pick];
  const others = reward ? [...reward.others, ...(option?.others ?? [])] : game && item.event ? rewardOptions(item.event.effects ?? [], game, EMPTY).others : [];
  const goal = reward?.goal;
  const hub = `/games/${item.instanceId}`;

  return (
    <aside className="card cal-sel" aria-label="Selected">
      <div className="spread">
        <h3>Selected</h3>
        <button type="button" className="btn panel-close" aria-label="Close" onClick={onClose}>
          ✕ Close
        </button>
      </div>
      <div className="cal-art">
        {keyArt ? (
          <img className="key-art" src={keyArt} alt="" onError={(event) => (event.currentTarget.hidden = true)} />
        ) : art ? (
          <GameIcon
            src={assetUrl(item.gameKey, "splash", splashKey(item.gameKey, art.icon, art.splash))}
            fallback={[communityAssetUrl(item.gameKey, "splash", splashKey(item.gameKey, art.icon, art.splash)), communityAssetUrl(item.gameKey, "character", art.icon)]}
            alt={art.name ?? art.catalogId}
            glyph="character"
          />
        ) : (
          <HeroArt gameKey={item.gameKey} />
        )}
      </div>
      <h2 className={item.kind === "banner" ? "font-serif" : undefined}>{item.kind === "banner" ? topNames((item.banners ?? []).flatMap((banner) => banner.featured)) || item.name : item.name}</h2>
      {wishKey && (
        <button className="btn sm cal-wish" aria-pressed={wished} disabled={wish.isPending} onClick={() => wish.mutate(!wished)}>
          Wishlist
        </button>
      )}
      <div className="cal-meta">
        <GameMark gameKey={item.gameKey} className="cal-sel-icon" />
        <span>
          {game?.name ?? item.gameKey} · {KIND[item.kind]}
        </span>
      </div>
      <dl className="cal-dl">
        {item.start > now && (
          <>
            <dt>Starts</dt>
            <dd>{LOCAL.format(item.start)}</dd>
          </>
        )}
        <dt>Ends</dt>
        <dd>
          {LOCAL.format(item.end)} <span className="text-muted">your time</span>
          <div className="font-mono text-muted">{serverTime(item.end, item.region.utcOffsetMinutes)} server</div>
        </dd>
        {reward && reward.stages > 0 && (
          <>
            <dt>Progress</dt>
            <dd>
              {goal?.done ?? 0} / {reward.stages} stages · <Link to={hub}>in Activities</Link>
            </dd>
          </>
        )}
        {item.kind === "banner" && featured.length > 0 && (
          <>
            <dt>Featured</dt>
            <dd className="cal-sel-featured">
              {/* Each unit once as its icon, yours ticked; a character opens its page (Georges, 2026-10-10: from the banners to the character in one click). */}
              <FeaturedUnits gameKey={item.gameKey} instanceId={item.instanceId} units={(item.banners ?? []).flatMap((banner) => banner.featured)} shown={8} />
              <Link to={`${hub}/pulls`}>Pulls</Link>
            </dd>
          </>
        )}
        {item.kind === "cycle" && (
          <>
            <dt>Results</dt>
            <dd>
              <Link to={`${hub}/endgame`}>on the Endgame tab</Link>
            </dd>
          </>
        )}
      </dl>

      {reward && (
        <div className="cal-reward">
          <div className="cal-reward-head">
            <span className="kpi-label">Reward</span>
            {reward.options.length > 1 && <span className="badge">Choose 1</span>}
            {goal && <span className="badge done">{goal.claimed ? "Claimed" : "Goal set"}</span>}
          </div>
          {reward.options.map((rewardOption, optionIndex) => (
            <label key={optionIndex} className="cal-opt">
              <input type="radio" name={`pick-${reward.eventId}`} checked={pick === optionIndex} disabled={goal?.claimed} onChange={() => setPick(optionIndex)} />
              <span>{rewardOption.label ?? rewardOption.changes.map((change) => change.name).join(", ")}</span>
              <span className="font-mono">{rewardOption.changes.map(stepText).join(" · ")}</span>
            </label>
          ))}
          <div className="cal-actions">
            <button className="btn primary" disabled={pick === null || goal?.claimed || (goal && goal.choice === pick) || makeGoal.isPending} onClick={() => makeGoal.mutate()}>
              {goal ? "Update goal" : "Make goal"}
            </button>
            <button className="btn" aria-pressed={goal?.notify ?? false} disabled={!goal || goal.claimed || remind.isPending} onClick={() => remind.mutate(!goal!.notify)}>
              Remind 48 h before
            </button>
          </div>
        </div>
      )}
      {others.length > 0 && <p className="cal-note text-muted">Also in this event: {others.join(", ")}.</p>}
    </aside>
  );
}
