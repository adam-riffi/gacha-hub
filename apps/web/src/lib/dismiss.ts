import { useEffect, type RefObject } from "react";

/**
 * Closes a window (a side panel, a pop-up) on a press outside it or on Escape
 * (Georges, round 6: "for all the windows I wanna be able to get out of them
 * by clicking outside of it"). Inactive while the window is closed.
 */
export function useDismiss(ref: RefObject<HTMLElement | null>, onAway: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    // A window's own opener (marked data-opens-panel) is left to toggle it (round 9: a second click on a weapon flickered,
    // closing here then reopening on its click).
    const down = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest?.("[data-opens-panel]")) return;
      if (ref.current && !ref.current.contains(event.target as Node)) onAway();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onAway();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [ref, onAway, active]);
}
