import type { ReactNode } from "react";

type Kind = "stars" | "difficulty" | "seals" | "crests" | "acts" | "rank" | "points";

/** An endgame mode's metric by its icon (Georges, round 8: "it lacks difficulty icons"), in the stat icons' line style. */
const PATHS: Record<Kind, ReactNode> = {
  stars: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  difficulty: (
    <>
      <path d="M5 11a7 7 0 1 1 14 0v3l-2 1v4H7v-4l-2-1z" />
      <circle cx="9.5" cy="11.5" r="1.5" />
      <circle cx="14.5" cy="11.5" r="1.5" />
      <path d="M10 19v-2M14 19v-2" />
    </>
  ),
  seals: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m12 7 1.5 3.2 3.5.4-2.6 2.4.7 3.5L12 14.8 8.9 16.5l.7-3.5L7 10.6l3.5-.4z" />
    </>
  ),
  crests: <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6zM9 11l2 2 4-4" />,
  acts: <path d="M4 5h16v5a8 8 0 0 1-16 0zM8 9h2M14 9h2M9 13c1.5 1.3 4.5 1.3 6 0" />,
  rank: (
    <>
      <path d="M12 2 20 7v10l-8 5-8-5V7z" />
      <path d="M14.5 9.5C14 8.6 13 8 12 8c-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1 0-2-.6-2.5-1.5" />
    </>
  ),
  points: <path d="M6 3h12l3 6-9 12L3 9zM3 9h18" />,
};

const kindOf = (label: string): Kind =>
  /star/i.test(label) ? "stars" : /difficult/i.test(label) ? "difficulty" : /seal/i.test(label) ? "seals" : /crest/i.test(label) ? "crests" : /act/i.test(label) ? "acts" : /rank|frontier/i.test(label) ? "rank" : "points";

export function MetricIcon({ label, on = true }: { label: string; on?: boolean }) {
  const kind = kindOf(label);
  return (
    <svg className={`metric-icon ${on ? "is-on" : ""}`} data-metric={kind} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[kind]}
    </svg>
  );
}
