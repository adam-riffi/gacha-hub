import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getGame, rewardOptions, type RewardDto, type RosterChange } from "@gacha/shared";
import { api } from "../../lib/api";
import { assetUrl, communityAssetUrl, splashKey } from "../../lib/assets";
import { GameIcon } from "../GameIcon";
import type { CalItem } from "../../pages/CalendarPage";

const LOCAL = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const UTC = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const KIND = { banner: "Banner", event: "Event", cycle: "Endgame cycle", pass: "Pass" } as const;
const EMPTY = { dupes: new Map<string, number>(), owned: new Set<string>(), names: new Map<string, string>() };

/** "C2 → C3", or "new → C0" for a unit not owned yet. */
export const stepText = (c: RosterChange) => `${c.from === null ? "new" : `${c.letter}${c.from}`} → ${c.letter}${c.to}`;

/** An instant in server time ("Tue 3 Nov, 23:59 · UTC+1"). */
function serverTime(t: number, offsetMinutes: number) {
  const h = offsetMinutes / 60;
  return `${UTC.format(t + offsetMinutes * 60_000)} · UTC${h >= 0 ? "+" : "−"}${Math.abs(h)}`;
}

/**
 * The calendar's selected item (WIREFRAMES.md A4): art, end in your time and
 * server time, progress, and for a reward event a picker with one row per
 * choice and its effect, then Make goal and a reminder 48 h before it ends.
 */
export function CalendarSelected({ item, reward, now, onClose }: { item: CalItem | null; reward?: RewardDto; now: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [pick, setPick] = useState<number | null>(reward?.goal?.choice ?? (reward?.options.length === 1 ? 0 : null));
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["rewards"] }), qc.invalidateQueries({ queryKey: ["tasks"] })]);
  const makeGoal = useMutation({
    mutationFn: () => api.post(`/api/events/${reward!.eventId}/goal`, { instanceId: reward!.instanceId, ...(reward!.options.length > 1 ? { choice: pick } : {}) }),
    onSuccess: refresh,
  });
  const remind = useMutation({ mutationFn: (notify: boolean) => api.put(`/api/tasks/${reward!.goal!.id}`, { notify }), onSuccess: refresh });

  if (!item) {
    return (
      <aside className="card cal-sel" aria-label="Selected">
        <h3>Selected</h3>
        <p className="mu">Pick a bar to see its dates, progress and rewards.</p>
      </aside>
    );
  }

  const game = getGame(item.gameKey);
  const featured = (item.banners ?? []).flatMap((b) => b.featured).filter((f) => (f.rarity ?? 0) >= 5 || f.kind === "character");
  const art = featured[0];
  const option = pick === null ? undefined : reward?.options[pick];
  const others = reward ? [...reward.others, ...(option?.others ?? [])] : game && item.event ? rewardOptions(item.event.effects ?? [], game, EMPTY).others : [];
  const goal = reward?.goal;
  const unit = option?.changes[0];
  const hub = `/games/${item.instanceId}`;

  return (
    <aside className="card cal-sel" aria-label="Selected">
      <div className="spread">
        <h3>Selected</h3>
        <button className="btn icon" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="cal-art">
        {art ? (
          <GameIcon
            src={assetUrl(item.gameKey, "splash", splashKey(item.gameKey, art.icon, art.splash))}
            fallback={[communityAssetUrl(item.gameKey, "splash", splashKey(item.gameKey, art.icon, art.splash)), communityAssetUrl(item.gameKey, "character", art.icon)]}
            alt={art.name ?? art.catalogId}
          />
        ) : (
          <GameIcon src={game?.art?.background ?? null} alt={`${game?.name ?? item.gameKey} art`} label={game?.shortName ?? item.gameKey} />
        )}
      </div>
      <h2 className={item.kind === "banner" ? "sf" : undefined}>{item.name}</h2>
      <div className="cal-meta">
        {game?.name ?? item.gameKey} · {KIND[item.kind]} · {item.source}
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
          {LOCAL.format(item.end)} <span className="mu">your time</span>
          <div className="mn mu">{serverTime(item.end, item.region.utcOffsetMinutes)} server</div>
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
            <dd>
              {/* Each featured character opens its page (Georges, 2026-10-10: from the banners to the character in one click). */}
              {featured.map((f, i) => (
                <span key={`${f.kind}:${f.catalogId}`}>
                  {i > 0 && ", "}
                  {f.kind === "character" ? <Link to={`${hub}/units/${f.catalogId}`}>{f.name ?? f.catalogId}</Link> : (f.name ?? f.catalogId)}
                  {f.owned ? " (owned)" : ""}
                </span>
              ))}{" "}
              · <Link to={`${hub}/pulls`}>Pulls</Link>
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
          {reward.options.map((o, i) => (
            <label key={i} className="cal-opt">
              <input type="radio" name={`pick-${reward.eventId}`} checked={pick === i} disabled={goal?.claimed} onChange={() => setPick(i)} />
              <span>{o.label ?? o.changes.map((c) => c.name).join(", ")}</span>
              <span className="mn">{o.changes.map(stepText).join(" · ")}</span>
            </label>
          ))}
          {unit && (
            <p className="cal-note mu">
              The goal &ldquo;{reward.name}&rdquo; goes to Tasks with the event&apos;s deadline. Ticking it sets {unit.name} to {unit.letter}
              {unit.to}.
            </p>
          )}
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
      {others.length > 0 && <p className="cal-note mu">Also in this event: {others.join(", ")}.</p>}
    </aside>
  );
}
