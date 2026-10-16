import { useQuery } from "@tanstack/react-query";
import type { UnitAppearanceDto, UnitAppearancesDto } from "@gacha/shared";
import { api } from "../lib/api";

const DAY_MS = 86_400_000;

/** Every featured unit's banners for a game (round 11: "last seen"), by catalog id. */
export function useUnitAppearances(gameKey: string | undefined) {
  return useQuery({
    queryKey: ["appearances", gameKey],
    queryFn: () => api.get<UnitAppearancesDto>(`/api/games/${gameKey}/appearances`),
    enabled: Boolean(gameKey),
  });
}

const DAYS_PER_MONTH = 30.44;
const DAYS_PER_YEAR = 365.25;

/** How long ago a date was, rounded in its largest unit: "3 d ago", "1 wk ago", "10 mo ago", "6 yr ago". */
export function timeAgo(isoDate: string, now = Date.now()): string {
  const days = Math.max(0, Math.round((now - Date.parse(isoDate)) / DAY_MS));
  if (days < 7) return days === 0 ? "today" : `${days} d ago`;
  if (days < 30) return `${Math.round(days / 7)} wk ago`;
  if (days < 365) return `${Math.max(1, Math.round(days / DAYS_PER_MONTH))} mo ago`;
  return `${Math.round(days / DAYS_PER_YEAR)} yr ago`;
}

/** The order "Last seen" sorts by: the longest unseen first, then the ones on a banner now, then the ones never seen. */
export function lastSeenSortKey(appearance: UnitAppearanceDto | undefined): number {
  if (!appearance) return Number.POSITIVE_INFINITY;
  if (appearance.current) return Number.MAX_SAFE_INTEGER;
  return appearance.lastEnded ? Date.parse(appearance.lastEnded.endsAt) : Number.MAX_SAFE_INTEGER - 1;
}

/** A banner flag, the mark of a unit's last banner. */
export function BannerFlagIcon({ label }: { label: string }) {
  return (
    <svg className="last-seen-icon" viewBox="0 0 24 24" role="img" aria-label={label}>
      <path d="M6 21V3M6 4h12l-3 4.5L18 13H6" />
    </svg>
  );
}

/** In how many days a date comes: "tomorrow", "in 7 d". */
const inDays = (isoDate: string, now = Date.now()): string => {
  const days = Math.max(0, Math.round((Date.parse(isoDate) - now) / DAY_MS));
  return days <= 1 ? "tomorrow" : `in ${days} d`;
};

/**
 * A unit's last banner on its card, its state colouring the chip (round 12: readable at a glance): on a banner NOW in
 * the accent, a dated return ("back in 7 d") next, then how long ago the last ended, or a first banner coming.
 */
export function LastSeenChip({ appearance }: { appearance: UnitAppearanceDto | undefined }) {
  if (!appearance) return null;
  const [state, text] = appearance.current
    ? ["now", "on a banner now"]
    : appearance.next
      ? ["returning", `back ${inDays(appearance.next.startsAt)}`]
      : appearance.lastEnded
        ? ["seen", timeAgo(appearance.lastEnded.endsAt)]
        : [null, null];
  if (!text) return null;
  const banner = appearance.current ?? appearance.next ?? appearance.lastEnded;
  return (
    <span className="last-seen-chip font-mono" data-state={state} title={banner ? `${banner.name} · ${appearance.runs} run${appearance.runs === 1 ? "" : "s"}` : undefined}>
      <BannerFlagIcon label="Last banner" />
      {text}
    </span>
  );
}
