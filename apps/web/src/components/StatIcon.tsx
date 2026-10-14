import type { ReactNode } from "react";
import { statKind, type StatKind } from "@gacha/shared";

const PATHS: Record<StatKind, ReactNode> = {
  hp: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  atk: <path d="M20 4l-1 5L9 19l-4-4L15 5zM5 15l4 4M3 21l3-3" />,
  def: <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />,
  critRate: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  critDmg: <path d="m12 2 2 6 6-2-4 5 5 3-6 1 1 6-4-4-4 4 1-6-6-1 5-3-4-5 6 2z" />,
  energy: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  mastery: (
    <>
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)" />
    </>
  ),
  spd: <path d="M4 7l5 5-5 5M11 7l5 5-5 5M19 6v12" />,
  heal: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M7 12h10" />
    </>
  ),
  effect: (
    <>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  dmg: <path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 3 3 3" />,
  break: <path d="M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6M12 8v8M8 12h8" />,
  pen: <path d="M3 12h14M13 7l5 5-5 5M8 5v14" />,
  other: <path d="m12 4 8 8-8 8-8-8z" />,
};


/** A stat's icon beside its name (round 7): the name stays for reading, the icon for a glance. */
export function StatIcon({ stat, className = "" }: { stat: string; className?: string }) {
  const kind = statKind(stat);
  return (
    <svg className={`stat-icon ${className}`} data-stat={kind} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[kind]}
    </svg>
  );
}
