import { expect, test, type Page } from "@playwright/test";

const accent = (page: Page) =>
  page.locator(".shell").evaluate((el) => getComputedStyle(el).getPropertyValue("--accent").trim().toLowerCase());

test("the rail moves between sections and the strip sets the scope @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto("/");

  const rail = page.getByRole("navigation", { name: "Sections" });
  const strip = page.getByRole("navigation", { name: "Scope" });
  for (const [name, url] of [
    ["Games", /\/library$/],
    ["Tasks and goals", /\/tasks$/],
    ["Banners and events", /\/timeline$/],
    ["Settings", /\/settings$/],
    ["Admin", /\/admin$/],
    ["Home, all games", /\/$/],
  ] as const) {
    await rail.getByRole("link", { name }).click();
    await expect(page).toHaveURL(url);
    await expect(rail.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
  }

  // On Home a game shows the same page for that game: only the accent changes.
  await expect(strip.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  expect(await accent(page)).toBe("#ff2d95");
  await strip.getByRole("link", { name: "Honkai: Star Rail" }).click();
  await expect(page).toHaveURL(/\/\?game=hsr$/);
  await expect(strip.getByRole("link", { name: "Honkai: Star Rail" })).toHaveAttribute("aria-current", "page");
  expect(await accent(page)).toBe("#ff8fd1");

  // The scope follows the rail: Banners filters to the game, Games opens its hub.
  await rail.getByRole("link", { name: "Banners and events" }).click();
  await expect(page).toHaveURL(/\/timeline\?game=hsr$/);
  await expect(page.locator(".cal-game-name", { hasText: "Honkai: Star Rail" })).toBeVisible();
  await expect(page.locator(".cal-game-name")).toHaveCount(1);
  await rail.getByRole("link", { name: "Games" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}$`));
  expect(await accent(page)).toBe("#ff8fd1");

  // Tasks holds today's dailies and the board.
  await strip.getByRole("link", { name: "Overview" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await rail.getByRole("link", { name: "Tasks and goals" }).click();
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});
