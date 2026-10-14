/** "3d 4h", "2h 05m", "12m", or "now" — mirrors the server helper. */
export function formatRemaining(iso: string, now = Date.now()): string {
  const milliseconds = new Date(iso).getTime() - now;
  if (milliseconds <= 0) return "now";
  const days = Math.floor(milliseconds / 86_400_000);
  const hours = Math.floor((milliseconds % 86_400_000) / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
