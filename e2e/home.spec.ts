import { expect, test } from "@playwright/test";

test("Home is the dashboard: its panels, the dailies card per game, the pulls and stamina tables @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/stellarJade`, { data: { value: 1600 } });
  await page.goto("/");

  // The design's panels (VISUAL-DESIGN.md §10) on the all-games Home, and nothing of the old Home.
  for (const name of ["Goals", "Goal types", "Backlog", "Pull history", "Dailies & weeklies", "Battle pass", "Dailies, last 26 weeks", "Banners", "Pulls", "Stamina", "Endgame · next resets", "Expiring soon"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  for (const name of ["Today", "Coming up", "Wallet", "Tasks"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(0);
  }

  // Pulls: every game with pull rules has its pity line under its row, zeros included (Georges, #101).
  const pullRows = page.locator(".pulls-card .lst > div");
  await expect(pullRows.first()).toBeVisible();
  for (const row of await pullRows.all()) {
    await expect(row.locator(".pull-row-pity")).toHaveText(/^Character \d+\/\d+.*Weapon \d+\/\d+.*Standard \d+\/\d+/);
  }

  // Dailies & weeklies: the game's own items (HSR seeds three dailies, with the design's Check-in, and two weeklies, with Echo of War) apart from the ones you add.
  const dailies = page.locator(".dailies-card");
  // One game at a time: the pointer holds the rotation, the arrows turn it to Star Rail.
  await dailies.hover();
  for (let i = 0; i < 8 && !(await dailies.locator(".dailies-game").textContent())?.includes("Honkai: Star Rail"); i++) await dailies.getByRole("button", { name: "Next game" }).click();
  await expect(dailies).toContainText("Honkai: Star Rail");
  await expect(dailies).toContainText("resets in");
  const tiles = dailies.locator(".kpi");
  await expect(tiles.nth(0)).toContainText("0 / 3");
  await expect(tiles.nth(1)).toContainText("0 / 0");
  await expect(tiles.nth(2)).toContainText("0 / 2");
  await expect(dailies.getByRole("img", { name: /0 of 5 recurring items done/ })).toBeVisible();

  // Pulls: 1600 jade is 10 warps, limited; nothing permanent yet.
  const pulls = page.locator(".pulls-card");
  const hsrPulls = pulls.locator(".rw", { hasText: "Honkai: Star Rail" });
  await expect(hsrPulls.locator(".pull-n").first()).toHaveText("10");
  // Each game's pulls by type as a number and its icon: limited first, then permanent and special (a banner's own tickets), which stay out of the total.
  await expect(hsrPulls.getByRole("img", { name: "limited pulls" })).toBeVisible();
  const zzz = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  expect((await page.request.put(`/api/instances/${zzz.id}/currencies/boopon`, { data: { value: 5 } })).ok()).toBe(true);
  await page.reload();
  const special = pulls.locator(".rw", { hasText: "Zenless Zone Zero" }).locator(".pull-n.is-special");
  await expect(special).toHaveText("5");
  await expect(special.getByRole("img", { name: "special pulls" })).toBeVisible();

  // Stamina: current over cap, and when it fills.
  const stamina = page.locator(".stamina-card");
  const row = stamina.locator(".rw", { hasText: "Honkai: Star Rail" });
  await expect(row).toContainText("Honkai: Star Rail");
  await expect(row).toContainText("/ 300");
  await expect(row.locator(".stamina-full")).not.toBeEmpty();
});
