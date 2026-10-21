import { expect, test } from "@playwright/test";

// Round 17 (Georges: "still no banner history"): Zenless, Wuthering Waves and NTE read their past banners from their
// wikis' banner pages (`npm run catalog:banners-wiki`), so their units carry a "last seen" like Genshin's and Star Rail's.
test("Zenless and Wuthering Waves units carry their banner history: appearances by the dozen, last-seen chips on the grid @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  for (const gameKey of ["zzz", "wuwa"]) {
    const { id } = (await (await page.request.post("/api/instances", { data: { gameKey } })).json()) as { id: string };
    const appearances = (await (await page.request.get(`/api/games/${gameKey}/appearances`)).json()) as Record<string, unknown[]>;
    expect(Object.keys(appearances).length, gameKey).toBeGreaterThanOrEqual(30);
    await page.goto(`/games/${id}/characters`);
    await expect(page.locator("article.ch-card").first()).toBeVisible();
    expect(await page.locator(".last-seen-chip").count(), gameKey).toBeGreaterThanOrEqual(10);
  }
});
