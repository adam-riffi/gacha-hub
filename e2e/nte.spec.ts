import { expect, test } from "@playwright/test";

test("Neverness to Everness works by hand on every screen @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  // Added from the library, like any game; it lands on Activities.
  await page.goto("/library");
  await page.getByRole("button", { name: "+ Neverness to Everness" }).click();
  await expect(page).toHaveURL(/\/games\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Neverness to Everness" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Character Pixels" })).toContainText("/ 240");
  const tabs = page.getByRole("navigation", { name: "Game screens" });
  await tabs.getByRole("link", { name: "Activities" }).click();
  await expect(page.getByRole("region", { name: "Daily" })).toBeVisible();

  // Endgame: Beyond the Rails, typed by hand.
  await tabs.getByRole("link", { name: "Endgame" }).click();
  const rails = page.getByRole("region", { name: "Beyond the Rails" });
  await rails.getByRole("button", { name: "Update Beyond the Rails" }).click();
  await rails.getByLabel("Seals", { exact: true }).fill("30");
  await rails.getByLabel("Annulith", { exact: true }).fill("800");
  await rails.getByRole("button", { name: "Save" }).click();
  await expect(rails).toContainText("30 / 36");

  // Pulls: the Limited Board's pity.
  await tabs.getByRole("link", { name: "Pulls" }).click();
  const board = page.getByRole("region", { name: /Limited Board/ });
  await board.getByRole("button", { name: "+10" }).click();
  await expect(board.getByTestId("pity")).toHaveText("10");

  // A build, by name (no catalog), is added on Characters and opens its sheet.
  await tabs.getByRole("link", { name: "Characters" }).click();
  await page.getByLabel("Character name").fill("Nanally");
  await page.getByRole("button", { name: "+ Add" }).click();
  await expect(page).toHaveURL(/\/characters\//);
  await expect(page.getByText("Level").first()).toBeVisible();

  // Home with NTE picked: its dashboard.
  await page.goto("/?game=nte");
  await expect(page.getByRole("region", { name: "Pulls" })).toBeVisible();
});
