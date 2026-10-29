import { expect, test } from "@playwright/test";

// Round 24 (Georges, 2026-10-29: "the odds/estimate thing is a bit weird"): the odds are three tiles of one size, each a
// big figure under a short label: the next pull, by soft pity, with the pulls you hold. No table.
test("a banner's odds are three tiles of one size: next pull, by soft pity, with your pulls @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/stellarJade`, { data: { value: 4000 } });
  await page.goto(`/games/${id}/pulls`);
  const banner = page.getByRole("region", { name: "Character event warp" });
  const tiles = banner.getByRole("group", { name: "Odds" }).locator(".odds-tile");
  await expect(tiles).toHaveCount(3);
  await expect(tiles.nth(0)).toContainText("Next pull");
  await expect(tiles.nth(1)).toContainText("By soft pity");
  await expect(tiles.nth(2)).toContainText("With 25");
  const boxes = await tiles.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((box) => [Math.round(box.width), Math.round(box.height)]));
  for (const [width, height] of boxes.slice(1)) {
    expect(Math.abs(width - boxes[0]![0]!)).toBeLessThanOrEqual(1);
    expect(Math.abs(height - boxes[0]![1]!)).toBeLessThanOrEqual(1);
  }
  // The figure reads large.
  expect(parseFloat(await tiles.nth(0).locator(".odds-figure").evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(26);
  await expect(banner.locator("table.pl-odds")).toHaveCount(0);
});
