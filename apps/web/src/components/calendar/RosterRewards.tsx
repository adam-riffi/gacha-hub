import { getGame, type RewardDto } from "@gacha/shared";
import { stepText } from "./CalendarSelected";

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** "Rewards that update your roster" (WIREFRAMES.md A4): each claimable unit reward, its effect, its end and its goal. */
export function RosterRewards({ rewards, onPick }: { rewards: RewardDto[]; onPick: (eventId: string) => void }) {
  return (
    <section className="card cal-rewards" aria-label="Rewards that update your roster">
      <h3>Rewards that update your roster</h3>
      {rewards.length === 0 && <p className="text-muted">No open event rewards a character or a weapon right now.</p>}
      {rewards.map((reward) => {
        const chosen = reward.goal?.choice ?? (reward.options.length === 1 ? 0 : null);
        const option = chosen === null ? undefined : reward.options[chosen];
        const effect = option ? option.changes.map((change) => `${change.name} ${stepText(change)}`).join(" · ") : `choose 1 of ${reward.options.length}`;
        return (
          <div className="cal-rw" key={reward.eventId}>
            <div>
              <button type="button" className="cal-rw-name" onClick={() => onPick(reward.eventId)}>
                {reward.name}
              </button>
              <div className="font-mono text-muted">
                {getGame(reward.gameKey)?.shortName ?? reward.gameKey} · {effect} · ends {DAY.format(new Date(reward.endsAt))}
              </div>
            </div>
            {reward.goal ? (
              <span className="badge done">{reward.goal.claimed ? "Claimed" : "Goal set"}</span>
            ) : (
              <button className="btn" onClick={() => onPick(reward.eventId)}>
                Make goal
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
