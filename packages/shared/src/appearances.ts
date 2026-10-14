import type { BannerSeenDto, UnitAppearanceDto } from "./dto/banner.js";

/** What a banner needs to count as an appearance: its key, name, dates and featured units. */
export interface FeaturingBanner {
  key: string;
  name: string;
  startsAt: Date | string;
  endsAt: Date | string;
  featured: readonly { catalogId: string }[];
}

/**
 * Every banner each unit was featured on (Georges, round 11: "I'd like to have a 'last seen' info on characters to see their last
 * banners"): newest first, with the last ended, the one on now, the next one and how many ran so far.
 */
export class UnitBannerAppearances {
  private readonly bannersByCatalogId = new Map<string, FeaturingBanner[]>();

  constructor(
    banners: readonly FeaturingBanner[],
    private readonly now: Date = new Date(),
  ) {
    const newestFirst = [...banners].sort((later, earlier) => new Date(earlier.startsAt).getTime() - new Date(later.startsAt).getTime());
    for (const banner of newestFirst) {
      for (const catalogId of new Set(banner.featured.map((unit) => unit.catalogId))) {
        this.bannersByCatalogId.set(catalogId, [...(this.bannersByCatalogId.get(catalogId) ?? []), banner]);
      }
    }
  }

  /** One unit's appearances, or null when no banner featured it. */
  summaryFor(catalogId: string): UnitAppearanceDto | null {
    const banners = this.bannersByCatalogId.get(catalogId);
    if (!banners) return null;
    const nowTime = this.now.getTime();
    const hasEnded = (banner: FeaturingBanner) => new Date(banner.endsAt).getTime() <= nowTime;
    const hasStarted = (banner: FeaturingBanner) => new Date(banner.startsAt).getTime() <= nowTime;
    const upcoming = banners.filter((banner) => !hasStarted(banner));
    return {
      runs: banners.filter(hasStarted).length,
      lastEnded: this.seen(banners.find(hasEnded)),
      current: this.seen(banners.find((banner) => hasStarted(banner) && !hasEnded(banner))),
      next: this.seen(upcoming.at(-1)),
      history: banners.map((banner) => this.seen(banner)!),
    };
  }

  /** Every featured unit's appearances by its catalog id. */
  toRecord(): Record<string, UnitAppearanceDto> {
    return Object.fromEntries([...this.bannersByCatalogId.keys()].map((catalogId) => [catalogId, this.summaryFor(catalogId)!]));
  }

  private seen(banner: FeaturingBanner | undefined): BannerSeenDto | null {
    return banner ? { key: banner.key, name: banner.name, startsAt: new Date(banner.startsAt).toISOString(), endsAt: new Date(banner.endsAt).toISOString() } : null;
  }
}
