import { expect, test } from "@playwright/test";

// Round 29 (Georges, 2026-10-31: "the navbar seems redundant … i was also talking about the side nav bar as well"): two
// layers. The side bar is the scope: ALL, then every game as its icon with its short name, one size, all in view without
// arrows; Settings at its foot. The top bar is the screens of that scope: Home, Tasks and Banners under ALL; a game's own
// screens inside a game. The strip is gone.
test("the side bar is the scope and the top bar the screens; the strip is gone @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  for (const gameKey of ["hsr", "zzz", "wuwa", "nte", "endfield"]) await page.request.post("/api/instances", { data: { gameKey } });
  await page.goto("/");
  const rail = page.getByRole("navigation", { name: "Scope" });
  const all = rail.getByRole("link", { name: "All games" });
  await expect(all).toHaveAttribute("aria-current", "page");
  // Every game as its icon with its short name, one size, in view at once; no arrows, no strip.
  const games = rail.locator(".rail-game");
  expect(await games.count()).toBeGreaterThanOrEqual(5);
  const sizes = await games.evaluateAll((els) => els.map((el) => `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));
  expect(new Set(sizes).size, sizes.join(" ")).toBe(1);
  for (const link of await games.all()) await expect(link).toBeInViewport();
  const hsr = rail.getByRole("link", { name: "Honkai: Star Rail" });
  await expect(hsr).toContainText("Star Rail");
  expect((await hsr.locator(".rail-game-icon").boundingBox())!.width, "the icon large").toBeGreaterThanOrEqual(48);
  await expect(page.getByRole("button", { name: /Earlier games|Later games/ })).toHaveCount(0);
  await expect(page.locator(".strip, .strip-games")).toHaveCount(0);
  await expect(rail.getByRole("link", { name: "Settings" })).toBeVisible();

  // The top bar under ALL: Home, Tasks, Banners, and nothing else picks a screen.
  const sections = page.getByRole("navigation", { name: "Sections" });
  await expect(sections.getByRole("link")).toHaveCount(3);
  await expect(sections.getByRole("link", { name: "Home, all games" })).toHaveAttribute("aria-current", "page");
  await sections.getByRole("link", { name: "Tasks and goals" }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(sections.getByRole("link", { name: "Tasks and goals" })).toHaveAttribute("aria-current", "page");
  await expect(all).toHaveAttribute("aria-current", "page");

  // From Tasks a game leads to its Planner (its goals live there); from Home, to its hub.
  await hsr.click();
  await expect(page).toHaveURL(/\/games\/[^/]+\/planner$/);
  await all.click();
  await expect(page).toHaveURL(/\/$/);
  await hsr.click();
  await expect(page).toHaveURL(/\/games\/[^/]+$/);
  await expect(hsr).toHaveAttribute("aria-current", "page");
  await expect(all).not.toHaveAttribute("aria-current", "page");
  // Inside a game the top bar is the game's screens: one bar, none repeated in the content.
  const screens = page.getByRole("navigation", { name: "Game screens" });
  await expect(screens.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Sections" })).toHaveCount(0);
  await expect(page.locator(".content .hub-tabs")).toHaveCount(0);
  await screens.getByRole("link", { name: "Pulls" }).click();
  await expect(page).toHaveURL(/\/pulls$/);
  await expect(screens.getByRole("link", { name: "Pulls" })).toHaveAttribute("aria-current", "page");
  await all.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});
