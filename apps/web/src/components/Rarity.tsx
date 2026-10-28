/**
 * A rarity as a row of stars in its colour (round 23, Georges: "use icons as well for rarity … add colors"): gold for
 * five, purple for four, blue for three, orange for six; named for screen readers, never "★5" in letters.
 */
export function Rarity({ value, className = "" }: { value: number | null | undefined; className?: string }) {
  if (!value) return null;
  const count = Math.max(1, Math.min(6, value));
  return (
    <span className={`rarity ${className}`} data-rarity={count} role="img" aria-label={`${count} stars`} title={`${count} stars`}>
      {Array.from({ length: count }, (_, index) => (
        <svg key={index} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}
