import { useEffect, type RefObject } from "react";

/**
 * Closes a window (a side panel, a pop-up) on a press outside it or on Escape
 * (Georges, round 6: "for all the windows I wanna be able to get out of them
 * by clicking outside of it").
 */
export function useDismiss(ref: RefObject<HTMLElement | null>, onAway: () => void) {
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onAway();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onAway();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [ref, onAway]);
}
