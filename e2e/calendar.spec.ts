import { expect, test } from "@playwright/test";

const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

test("paging the calendar back shows what already ended @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
  const upload = await page.request.post("/api/admin/payload", {
    data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-ended", name: "E2E ended warp", kind: "character", startsAt: iso(-20), endsAt: iso(-10) }] },
  });
  expect(upload.ok()).toBe(true);

  await page.goto("/timeline");
  await expect(page.getByRole("heading", { name: "Banners & events" })).toBeVisible();
  await expect(page.locator(".cal-name", { hasText: "E2E ended warp" })).toHaveCount(0); // the window starts 3 days ago

  await page.getByRole("button", { name: "‹ 2 weeks" }).click();
  await expect(page.locator(".cal-name", { hasText: "E2E ended warp" })).toBeVisible();
});
