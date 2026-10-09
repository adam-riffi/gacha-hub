/**
 * Urgency is a paper chip, never a colour (VISUAL-DESIGN.md §7): a banner,
 * event or pass ending within 48 hours, or a daily reset within 3 hours.
 */
const H = 3_600_000;
const WINDOW = { deadline: 48 * H, reset: 3 * H } as const;

export function isUrgent(at: string | number | Date, kind: keyof typeof WINDOW, now = Date.now()): boolean {
  const left = new Date(at).getTime() - now;
  return left >= 0 && left <= WINDOW[kind];
}
