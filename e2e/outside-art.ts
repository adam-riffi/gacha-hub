import type { Page } from "@playwright/test";

/**
 * Pictures from outside the app (the community CDNs, and since round 22 every art slot's source while the store is empty)
 * are refused, so a journey about the drawn emblems and the tiles sees them: only the app's own pictures (its uploads, the
 * catalog's local art) load.
 */
export const blockOutsideArt = (page: Page) =>
  page.route("**/*", (route) => (route.request().resourceType() === "image" && new URL(route.request().url()).hostname !== "localhost" ? route.abort() : route.continue()));
