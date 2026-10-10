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
  // Each game's pulls by type as a number and its icon: limited first, then permanent and special (a banner's own tickets), which stay out of the total.
  await expect(pulls.locator(".rw").first().getByRole("img", { name: "limited pulls" })).toBeVisible();
  const zzz = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  expect((await page.request.put(`/api/instances/${zzz.id}/currencies/boopon`, { data: { value: 5 } })).ok()).toBe(true);
  await page.goto("/?game=zzz");
  const special = pulls.locator(".rw").first().locator(".pull-n.is-special");
  await expect(special).toHaveText("5");
  await expect(special.getByRole("img", { name: "special pulls" })).toBeVisible();
  await page.goto("/?game=hsr");

  // Stamina: current over cap, and when it fills.
  const stamina = page.locator(".stamina-card");
  const row = stamina.locator(".rw").first();
  await expect(row).toContainText("Honkai: Star Rail");
  await expect(row).toContainText("/ 300");
  await expect(row.locator(".stamina-full")).not.toBeEmpty();
});
