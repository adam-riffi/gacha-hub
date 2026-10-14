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
            {hobbies.map((h) => (
              <span key={h} className="tag">
                {h}
              </span>
            ))}
          </span>
        )}
      </div>
      <ul className="gf-list">
        {gifts.map((g) => {
          const item = index?.materials.get(g.itemId);
          return (
            <li key={g.itemId} className={g.points && g.points >= 400 ? "is-top" : g.hobbies && g.hobbies.length > 1 ? "is-top" : ""}>
              <CatalogIcon gameKey={gameKey} kind="material" icon={item?.icon} name={item?.name ?? g.itemId} className="gf-icon" />
              <span className="gf-name">{item?.name ?? g.itemId}</span>
              {g.points ? <span className="cd gf-points">+{g.points}</span> : null}
              {g.hobbies?.length ? <span className="mn gf-match">{g.hobbies.join(" · ")}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
