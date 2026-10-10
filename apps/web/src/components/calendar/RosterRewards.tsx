import { getGame, type RewardDto } from "@gacha/shared";
import { stepText } from "./CalendarSelected";

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** "Rewards that update your roster" (WIREFRAMES.md A4): each claimable unit reward, its effect, its end and its goal. */
export function RosterRewards({ rewards, onPick }: { rewards: RewardDto[]; onPick: (eventId: string) => void }) {
  return (
    <section className="card cal-rewards" aria-label="Rewards that update your roster">
      <h3>Rewards that update your roster</h3>
      {rewards.length === 0 && <p className="mu">No open event rewards a character or a weapon right now.</p>}
      {rewards.map((r) => {
        const chosen = r.goal?.choice ?? (r.options.length === 1 ? 0 : null);
        const option = chosen === null ? undefined : r.options[chosen];
        const effect = option ? option.changes.map((c) => `${c.name} ${stepText(c)}`).join(" · ") : `choose 1 of ${r.options.length}`;
        return (
          <div className="cal-rw" key={r.eventId}>
            <div>
              <button type="button" className="cal-rw-name" onClick={() => onPick(r.eventId)}>
                {r.name}
              </button>
              <div className="mn mu">
                {getGame(r.gameKey)?.shortName ?? r.gameKey} · {effect} · ends {DAY.format(new Date(r.endsAt))}
              </div>
            </div>
            {r.goal ? (
              <span className="badge done">{r.goal.claimed ? "Claimed" : "Goal set"}</span>
            ) : (
              <button className="btn" onClick={() => onPick(r.eventId)}>
                Make goal
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
