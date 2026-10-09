import { expect, test } from "@playwright/test";

test("Home is the dashboard: its panels, the dailies card per game, the pulls and stamina tables @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/stellarJade`, { data: { value: 1600 } });
  await page.goto("/?game=hsr");

  // The design's panels (VISUAL-DESIGN.md §10), and nothing of the old Home.
  for (const name of ["Goals", "Goal types", "Backlog", "Pull history", "Dailies & weeklies", "Battle pass", "Dailies, last 26 weeks", "Banners", "Pulls", "Stamina"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  for (const name of ["Today", "Coming up", "Wallet", "Tasks"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(0);
  }

  // Dailies & weeklies: the game's own items (HSR seeds two dailies and one weekly) apart from the ones you add.
  const dailies = page.locator(".dailies-card");
  await expect(dailies).toContainText("Honkai: Star Rail");
  await expect(dailies).toContainText("resets in");
  const tiles = dailies.locator(".kpi");
  await expect(tiles.nth(0)).toContainText("0 / 2");
  await expect(tiles.nth(1)).toContainText("0 / 0");
  await expect(tiles.nth(2)).toContainText("0 / 1");
  await expect(dailies.getByRole("img", { name: /0 of 3 recurring items done/ })).toBeVisible();

  // Pulls: 1600 jade is 10 warps, limited; nothing permanent yet.
  const pulls = page.locator(".pulls-card");
  await expect(pulls.locator(".pulls-total")).toHaveText("10");
  await expect(pulls.locator(".rw").first()).toContainText("Honkai: Star Rail");
  await expect(pulls.locator(".rw").first()).toContainText("10");

  // Stamina: current over cap, and when it fills.
  const stamina = page.locator(".stamina-card");
  const row = stamina.locator(".rw").first();
  await expect(row).toContainText("Honkai: Star Rail");
  await expect(row).toContainText("/ 300");
  await expect(row.locator(".stamina-full")).not.toBeEmpty();
});
