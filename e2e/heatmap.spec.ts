import { expect, test } from "@playwright/test";

test("the dailies heatmap shows today, answers the pointer and the keyboard, and pins a day @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
  await page.goto("/?game=hsr");

  const heat = page.getByRole("group", { name: /Dailies over the last 26 weeks/ });
  await expect(heat).toBeVisible();
  const readout = page.locator(".heat-readout");
  await expect(readout).toContainText("DAYS ALL DONE");
  await expect(readout).toContainText("CURRENT STREAK");

  // Only today has a record in V: hovering it shows the games done; other cells are plain.
  const today = heat.locator("[data-day]");
  await expect(today).toHaveCount(1);
  await today.hover();
  const tip = page.locator(".heat-tip");
  await expect(tip).toContainText("TODAY");
  await expect(tip).toContainText("/ 1 GAMES DONE");

  // Keyboard: focus the map, Enter pins the day under the cursor, Escape clears.
  await heat.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("group", { name: /TODAY/ })).toBeVisible();
  await expect(readout).toContainText("GAMES DONE");
  await expect(readout.locator(".dg")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(readout).toContainText("DAYS ALL DONE");
});
