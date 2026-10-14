import { useEffect, useState, useSyncExternalStore } from "react";
import { perBannerMs, slotMs, stepBanner, stepGame, type CarouselPosition } from "@gacha/shared";

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => {
  const mediaQuery = window.matchMedia(REDUCE);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
};

/** True when the viewer asked for reduced motion: no auto-rotation, no transitions. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(REDUCE).matches, () => false);
}

export type HomeCarousel = ReturnType<typeof useCarousel>;

/**
 * One clock for the Home carousels: the position steps a banner at a time
 * after that game's share of its slot (packages/shared/src/carousel.ts), and
 * the game changes when its banners run out. Rotation pauses while the viewer
 * hovers or focuses a card, and never runs under reduced motion. `tick`
 * changes on every move and `gameTick` when the game changes, so a progress
 * bar can restart.
 */
export function useCarousel(counts: readonly number[]) {
  const [position, setPosition] = useState<CarouselPosition>({ game: 0, banner: 0 });
  const [tick, setTick] = useState(0);
  const [gameTick, setGameTick] = useState(0);
  const [holds, setHolds] = useState(0);
  const reduced = useReducedMotion();
  const gameCount = counts.length;
  // A shorter roster (a game uninstalled, a scope picked) must not leave the position past the end.
  const game = Math.min(position.game, Math.max(0, gameCount - 1));
  const safe: CarouselPosition = game === position.game ? position : { game, banner: 0 };

  const move = (next: CarouselPosition) => {
    if (next.game !== safe.game) setGameTick((previous) => previous + 1);
    setPosition(next);
    setTick((previous) => previous + 1);
  };
  const rotating = !reduced && holds === 0 && gameCount > 0;
  const durationMs = perBannerMs(counts[safe.game] ?? 0);
  const gameMs = slotMs(counts[safe.game] ?? 0);

  useEffect(() => {
    if (!rotating) return;
    const id = setTimeout(() => move(stepBanner(safe, 1, counts)), durationMs);
    return () => clearTimeout(id);
    // counts is read inside the timeout; a new array each render would reset the timer every time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotating, durationMs, safe.game, safe.banner, tick]);

  return {
    pos: safe,
    tick,
    gameTick,
    rotating,
    durationMs,
    gameMs,
    next: () => move(stepBanner(safe, 1, counts)),
    prev: () => move(stepBanner(safe, -1, counts)),
    nextGame: () => move(stepGame(safe, 1, gameCount)),
    prevGame: () => move(stepGame(safe, -1, gameCount)),
    hold: () => setHolds((previous) => previous + 1),
    release: () => setHolds((previous) => Math.max(0, previous - 1)),
  };
}
