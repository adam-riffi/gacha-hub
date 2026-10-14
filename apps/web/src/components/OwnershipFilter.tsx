/** Which units a list shows by ownership (Georges, round 11: "filtering characters or anything on ownership/non ownership"). */
export type OwnershipView = "all" | "owned" | "notOwned" | "wishlist";

const VIEW_LABELS: Record<OwnershipView, string> = { all: "All", owned: "Owned", notOwned: "Not owned", wishlist: "Wishlist" };

/** Whether a unit fits the view picked. */
export function fitsOwnershipView(view: OwnershipView, unit: { owned: boolean; wished: boolean }): boolean {
  if (view === "owned") return unit.owned;
  if (view === "notOwned") return !unit.owned;
  if (view === "wishlist") return unit.wished;
  return true;
}

/** All, Owned, Not owned and Wishlist with their counts, one pressed; pressing the pressed one goes back to All. */
export function OwnershipFilter({ view, counts, onChange }: { view: OwnershipView; counts: Partial<Record<OwnershipView, number>>; onChange: (view: OwnershipView) => void }) {
  const views = (Object.keys(VIEW_LABELS) as OwnershipView[]).filter((candidate) => counts[candidate] !== undefined);
  return (
    <div className="ownership-filter" role="group" aria-label="Ownership">
      {views.map((candidate) => (
        <button key={candidate} type="button" className="chip" aria-pressed={view === candidate} onClick={() => onChange(view === candidate ? "all" : candidate)}>
          {VIEW_LABELS[candidate]} {counts[candidate]}
        </button>
      ))}
    </div>
  );
}
