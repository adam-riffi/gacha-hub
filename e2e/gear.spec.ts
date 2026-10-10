import { expect, test } from "@playwright/test";

test("Gear: the inventory by crit value, adding a piece and equipping it, storage, the views @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // Genshin alone has the artifact bag; removed again below, as the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  try {
    await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "10000021" } });
    await page.goto(`/games/${id}/gear`);
    await expect(page.getByRole("group", { name: "View" }).getByRole("button", { name: "Inventory" })).toHaveAttribute("aria-pressed", "true");

    const inventory = page.getByRole("region", { name: "Inventory" });
    await inventory.getByRole("button", { name: "+ Add piece" }).click();
    const form = page.getByRole("form", { name: "Piece" });
    await form.getByLabel("Set").fill("Gladiator's Finale");
    await form.getByLabel("Substat 1", { exact: true }).fill("CRIT Rate");
    await form.getByLabel("Substat 1 value").fill("10.5");
    await form.getByLabel("Substat 2", { exact: true }).fill("CRIT DMG");
    await form.getByLabel("Substat 2 value").fill("21");
    await form.getByRole("button", { name: "Save" }).click();

    const piece = inventory.getByRole("article").first();
    await expect(piece).toContainText("CV 42");
    await expect(piece).toContainText("Unequipped");
    await piece.getByRole("combobox", { name: "Equip on" }).selectOption({ label: "Amber" });
    await expect(inventory.getByRole("article").first()).toContainText("Amber");
    await expect(page.getByRole("region", { name: "Storage" })).toContainText("1 piece");

    await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Farm targets" }).click();
    await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Sets" }).click();
    await expect(page.getByText("Gladiator's Finale").first()).toBeVisible();
  } finally {
    await page.request.delete(`/api/instances/${id}`);
  }
});

test("Gear: a set is farmed from the Sets view (it lived on the Equipment tab) @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto(`/games/${id}/gear`);
  await page.getByRole("button", { name: /^Farm set/ }).first().click();
  await expect(page.getByText("Farming goal created")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Equipment" })).toHaveCount(0);
});
