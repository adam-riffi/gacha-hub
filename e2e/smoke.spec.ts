import { expect, test, type Page } from "@playwright/test";

/** The local dev login stands in for Discord sign-in (off in production). */
async function signIn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
}

test.describe.serial("smoke @smoke", () => {
  test("a signed-in user lands on Home", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Banners and events" })).toBeVisible();
  });

  test("adding Genshin opens its hub, whose overview has today's domains", async ({ page }) => {
    await signIn(page);
    await page.goto("/library");
    await page.getByRole("button", { name: "+ Genshin Impact" }).click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Genshin Impact" })).toBeVisible();
    // The hub opens on Activities (WIREFRAMES.md G1); the old overview is its last tab until F10.
    await expect(page.getByRole("region", { name: "Daily" })).toBeVisible();
    await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Overview" }).click();
    await expect(page.getByRole("heading", { name: "Happening now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Domains today/ })).toBeVisible();
  });

  test("the calendar shows a block per game", async ({ page }) => {
    await signIn(page);
    await page.goto("/timeline");
    await expect(page.getByRole("heading", { name: "Banners and events" })).toBeVisible();
    await expect(page.locator(".cal-game-name", { hasText: "Genshin Impact" })).toBeVisible();
  });
});
