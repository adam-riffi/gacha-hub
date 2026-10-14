import { cheapestTopUp, featuredWithin, pullForecast, worstCasePulls, type GameDefinition, type ServerClock } from "@gacha/shared";
import { UnitIcon } from "../CatalogIcon";
import { Glyph, bannerGlyph } from "../Glyph";
import { percentText, type PlannerTarget } from "./SavingsPlanner";

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const MS_DAY = 86_400_000;
const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/**
 * The top-up to a sure featured 5★ (Georges, round 6: "a top-up suggestion
 * taking into account upcoming rewards until the end of the banner, showing a
 * % of chance of getting the character by the end of the banner, and how many
 * top-ups of what kind at the lowest price would get the chances to 100%"):
 * each running banner's target, its chance with the pulls you have and the
 * dailies and pass until it ends, and the cheapest packs to its worst case.
 */
export function TopUpCard({ game, region, passEnds, targets }: { game: GameDefinition; region: ServerClock; passEnds: Date | null; targets: PlannerTarget[] }) {
  const now = new Date();
  const cost = game.currencies.find((currency) => (currency.pullCost ?? 0) > 1)?.pullCost ?? 0;
  return (
    <section className="card pl-topup" aria-label="Top-up to 100%">
      <div className="spread">
        <h3>Top-up to 100%</h3>
        <span className="mn mu">by each banner's end · cheapest packs</span>
      </div>
      <ul className="pl-chances pl-topup-list">
        {targets.map((target, targetIndex) => {
          const end = new Date(target.endsAt!);
          const pulls = target.available + pullForecast(game, region, now, passEnds, end).pulls;
          const short = worstCasePulls(target.rules, target.state) - pulls;
          // A pass bought now pays its dailies until the banner ends, after the one running.
          const from = passEnds && passEnds > now ? passEnds : now;
          const buy = Number.isFinite(short) && short > 0 && cost > 0 ? cheapestTopUp(game, short * cost, Math.floor((end.getTime() - from.getTime()) / MS_DAY)) : null;
          return (
            <li key={target.label + targetIndex} className="pl-topup-row">
              {target.unit ? <UnitIcon gameKey={game.key} unit={target.unit} /> : <Glyph kind={bannerGlyph(target.rules.key)} label={target.label} />}
              <span className="pl-chances-name">
                <strong>{target.label}</strong>
                <span className="mn mu">
                  by {DAY.format(end)} · {percentText(featuredWithin(target.rules, target.state, pulls))}
                </span>
              </span>
              <span className="pl-topup-buy">
                {short <= 0 ? (
                  <span className="badge done">Covered</span>
                ) : buy ? (
                  <>
                    <span className="mn" title={`${short} pulls short of a sure one`}>
                      {buy.items.map((item) => `${item.label}${item.count > 1 ? ` ×${item.count}` : ""}`).join(" · ")}
                    </span>
                    <strong>{USD_FORMAT.format(buy.price / 100)}</strong>
                  </>
                ) : (
                  <span className="mn mu">No sure way</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
