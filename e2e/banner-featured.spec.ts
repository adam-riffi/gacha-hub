import { expect, test } from "@playwright/test";

const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

// Round 24 (Georges, 2026-10-29: "i don't need to know the name of the banner just the featured characters. like for
// skirk i don't care about void star and la chanson cerise i need to know skirk escoffier mika candace dahlia tue nov 3rd"):
// a banner card names its featured units, the top rarity large, each with its name, and the day it ends; the banner's
// own name is gone from the Pulls cards and from Home's banner card.
test("a banner card names its featured units with their icons and the day it ends, never the banner's name: Pulls and Home @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const endsAt = iso(0.3);
  const featuring = (...catalogIds: string[]) => catalogIds.map((catalogId) => ({ catalogId, kind: "character", rateUp: true }));
  const upload = await page.request.post("/api/admin/payload", {
    data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-featured-names", name: "E2E featured names warp", kind: "character", startsAt: iso(-1), endsAt, featured: featuring("1205", "1009", "1001") }] },
  });
  expect(upload.ok()).toBe(true);
  try {
    await page.goto(`/games/${id}/pulls`);
    const card = page.getByRole("region", { name: "Character event warp" });
    const featured = card.getByRole("list", { name: "Featured units" });
    await expect(featured.getByRole("listitem")).toHaveCount(3);
    // Blade (5★) first and larger, then Asta and March 7th (4★), each with its name.
    await expect(featured.getByRole("listitem").first()).toContainText("Blade");
    await expect(featured).toContainText("Asta");
    await expect(featured).toContainText("March 7th");
    const blade = (await featured.getByRole("listitem").first().locator(".gicon").boundingBox())!;
    const asta = (await featured.getByRole("listitem").nth(1).locator(".gicon").boundingBox())!;
    expect(blade.height).toBeGreaterThanOrEqual(64);
    expect(asta.height).toBeLessThan(blade.height);
    await expect(card).toContainText(`Ends ${ENDS.format(new Date(endsAt))}`);
    await expect(card).not.toContainText("E2E featured names warp");

    // Home's banner card: the 5★'s name for its title, the banner's name nowhere.
    await page.goto("/?game=hsr");
    const home = page.locator(".banner-card");
    await home.hover();
    // Round 28: no title band; the featured units name the banner, the art opens Pulls.
    await expect(home.locator(".carousel-title")).toHaveCount(0);
    await expect(home.getByRole("list", { name: "Featured units" }).getByRole("listitem").first()).toHaveAccessibleName(/^Blade/);
    await expect(home).not.toContainText("E2E featured names warp");
  } finally {
    await page.request.delete("/api/admin/banners/hsr/e2e-featured-names");
  }
});
