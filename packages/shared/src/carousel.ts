/**
 * The Home carousels' rotation (VISUAL-DESIGN.md §7). Games run nearest
 * deadline first. A game with more banners stays longer (6 s plus 3 s per
 * extra banner) but shows each banner for less. One clock drives all three
 * cards: the Banners card steps per banner, and when a game's banners run out
 * the game changes, taking the Dailies and Battle-pass cards with it. A game
 * without banners holds one empty slot so it still gets its turn.
 */
export const SLOT_BASE_MS = 6000;
export const SLOT_EXTRA_MS = 3000;

export interface CarouselPosition {
  game: number;
  banner: number;
}

const slots = (bannerCount: number) => Math.max(1, bannerCount);

/** How long a game holds the stage. */
export function slotMs(bannerCount: number): number {
  return SLOT_BASE_MS + SLOT_EXTRA_MS * (slots(bannerCount) - 1);
}

/** How long each of a game's banners shows. */
export function perBannerMs(bannerCount: number): number {
  return slotMs(bannerCount) / slots(bannerCount);
}

/** Items sorted by their earliest deadline (epoch ms); ties and items without one keep their order. */
export function byNearestDeadline<T>(items: readonly T[], deadlines: (item: T) => readonly number[]): T[] {
  const next = (t: T) => {
    const ds = deadlines(t).filter(Number.isFinite);
    return ds.length ? Math.min(...ds) : Infinity;
  };
  return items
    .map((t, i) => ({ t, i, n: next(t) }))
    .sort((a, b) => a.n - b.n || a.i - b.i)
    .map((x) => x.t);
}

/** One banner forward or back; `counts[i]` is game i's banner count. */
export function stepBanner(pos: CarouselPosition, dir: 1 | -1, counts: readonly number[]): CarouselPosition {
  const n = counts.length;
  if (n === 0) return { game: 0, banner: 0 };
  const count = (g: number) => slots(counts[g] ?? 0);
  let { game, banner } = pos;
  if (dir > 0) {
    if (banner + 1 < count(game)) banner++;
    else {
      game = (game + 1) % n;
      banner = 0;
    }
  } else if (banner > 0) banner--;
  else {
    game = (game - 1 + n) % n;
    banner = count(game) - 1;
  }
  return { game, banner };
}

/** One game forward or back, at its first banner. */
export function stepGame(pos: CarouselPosition, dir: 1 | -1, gameCount: number): CarouselPosition {
  if (gameCount === 0) return { game: 0, banner: 0 };
  return { game: (pos.game + dir + gameCount) % gameCount, banner: 0 };
}
