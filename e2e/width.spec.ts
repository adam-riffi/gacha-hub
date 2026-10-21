import { expect, test } from "@playwright/test";

// Round 18 (the plan's audits round; Georges, round 15: desktop windows from 1100 to 2560 px, no phones): every screen fits
// an 1100 px window without a horizontal scroll, and still at 2560.
test.use({ viewport: { width: 1100, height: 900 } });

test("every screen fits an 1100 px window: Home, the library, the timeline, a game's Activities, Characters, Pulls and Endgame @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  for (const path of ["/", "/?game=hsr", "/library", "/timeline", `/games/${id}`, `/games/${id}/characters`, `/games/${id}/pulls`, `/games/${id}/endgame`]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, path).toBeLessThanOrEqual(1100);
  }
});

test.describe("a 2560 px window", () => {
  test.use({ viewport: { width: 2560, height: 1400 } });
  test("Home and a game's Activities fill it without a horizontal scroll @smoke", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
    for (const path of ["/", `/games/${id}`]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(2560);
    }
  });
});
