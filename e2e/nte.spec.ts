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

  // A catalog character (Hakushin's data, round 4): owned from its card, its build opens the sheet.
  await tabs.getByRole("link", { name: "Characters" }).click();
  await page.getByRole("searchbox", { name: "Search" }).fill("Sakiri");
  const sakiri = page.getByRole("article", { name: "Sakiri" });
  if (await sakiri.getByRole("button", { name: "Own" }).count()) await sakiri.getByRole("button", { name: "Own" }).click();
  await sakiri.getByRole("button", { name: "Start a build" }).click();
  await expect(page).toHaveURL(/\/characters\//);
  await expect(page.getByText("Level").first()).toBeVisible();

  // Home with NTE picked: its dashboard.
  await page.goto("/?game=nte");
  await expect(page.getByRole("region", { name: "Pulls" })).toBeVisible();
});

// Georges, round 7: "you haven't added the gear system for NTE": the Console's tab, its sets the cartridge series.
test("Neverness to Everness: the Console tab lists the cartridge series as its sets @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "nte" } })).json()) as { id: string };
  await page.goto(`/games/${id}`);
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Console" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/gear$`));
  for (const name of ["Lost Radiance", "Diabolos", "Shadow Creed"]) await expect(page.getByRole("article", { name })).toBeVisible();
  await page.getByRole("article", { name: "Lost Radiance" }).getByRole("button", { name: "Open Lost Radiance" }).click();
  await expect(page.getByRole("complementary", { name: "Lost Radiance" })).toBeVisible();
});
