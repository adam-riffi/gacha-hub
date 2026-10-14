import type { CatalogCharacter } from "@gacha/shared";
import { useCatalog } from "../../lib/catalog";
import { CatalogIcon } from "../CatalogIcon";

/**
 * A character's gifts (Georges, round 8: "for relevant games I want a gift/intimacy item list, like for NTE or Endfield"):
 * the ones it likes, the strongest first, each with its icon and what it gives (NTE's points) or the hobbies it matches
 * (Endfield, whose operators' hobbies head the list). Nothing for a character without any.
 */
export function GiftsCard({ gameKey, entry }: { gameKey: string; entry: CatalogCharacter }) {
  const { index } = useCatalog(gameKey);
  const gifts = entry.gifts ?? [];
  if (gifts.length === 0) return null;
  const hobbies = (entry.extra?.hobbies as string[] | undefined) ?? [];
  return (
    <section className="card gf" aria-label="Gifts">
      <div className="spread">
        <h3>Gifts</h3>
        {hobbies.length > 0 && (
          <span className="row gf-hobbies">
            {hobbies.map((hobby) => (
              <span key={hobby} className="tag">
                {hobby}
              </span>
            ))}
          </span>
        )}
      </div>
      <ul className="gf-list">
        {gifts.map((gift) => {
          const item = index?.materials.get(gift.itemId);
          return (
            <li key={gift.itemId} className={gift.points && gift.points >= 400 ? "is-top" : gift.hobbies && gift.hobbies.length > 1 ? "is-top" : ""}>
              <CatalogIcon gameKey={gameKey} kind="material" icon={item?.icon} name={item?.name ?? gift.itemId} className="gf-icon" />
              <span className="gf-name">{item?.name ?? gift.itemId}</span>
              {gift.points ? <span className="cd gf-points">+{gift.points}</span> : null}
              {gift.hobbies?.length ? <span className="mn gf-match">{gift.hobbies.join(" · ")}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
