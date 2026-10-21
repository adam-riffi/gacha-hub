import { expect, test } from "@playwright/test";

// Round 17 (Georges: "still no banner history"): Zenless, Wuthering Waves and NTE read their past banners from their
// wikis' banner pages (`npm run catalog:banners-wiki`), so Pulls lists them like Genshin's and Star Rail's.
test("Zenless and Wuthering Waves show their banner history on Pulls @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  for (const gameKey of ["zzz", "wuwa"]) {
    const { id } = (await (await page.request.post("/api/instances", { data: { gameKey } })).json()) as { id: string };
    const history = (await (await page.request.get(`/api/instances/${id}/pulls/history`)).json()) as { name: string; featured: unknown[] }[];
    expect(history.length, gameKey).toBeGreaterThanOrEqual(100);
    await page.goto(`/games/${id}/pulls`);
    const section = page.getByRole("region", { name: "Banner history" });
    await expect(section).toBeVisible();
    expect(await section.locator("tbody tr").count(), gameKey).toBeGreaterThanOrEqual(20);
  }
});
