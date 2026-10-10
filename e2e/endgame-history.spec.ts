import { expect, test } from "@playwright/test";

test("Endgame history per mode: tiles, chart, table, typing a past cycle and exporting CSV @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "genshin" } });
  const { id } = (await created.json()) as { id: string };
  await page.goto(`/games/${id}/endgame`);

  const history = page.getByRole("region", { name: "History" });
  await history.getByRole("group", { name: "Mode" }).getByRole("button", { name: "Spiral Abyss" }).click();
  await history.getByRole("button", { name: "Add a past cycle" }).click();
  await history.getByLabel("A day in the cycle").fill("2026-08-20");
  await history.getByLabel("Stars", { exact: true }).fill("36");
  await history.getByLabel("Primogems", { exact: true }).fill("800");
  await history.getByRole("button", { name: "Save" }).click();

  // The Abyss cycle of 16 Aug – 15 Sep 2026; a full clear is 36 stars.
  const row = history.getByRole("row", { name: /16 Aug – 15 Sep/ });
  await expect(row).toContainText("36");
  await expect(row).toContainText("800 / 800");
  await expect(history.getByText("Best")).toBeVisible();

  const download = page.waitForEvent("download");
  await history.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/spiral-abyss.*\.csv$/i);
});
