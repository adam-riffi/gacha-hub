import { expect, test } from "@playwright/test";

test("Endgame history per mode: tiles, chart, table, typing a past cycle and exporting CSV @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "zzz" } });
  const { id } = (await created.json()) as { id: string };
  await page.goto(`/games/${id}/endgame`);

  const history = page.getByRole("region", { name: "History", exact: true });
  await history.getByRole("group", { name: "Mode" }).getByRole("button", { name: "Deadly Assault" }).click();
  await history.getByRole("button", { name: "Add a past cycle" }).click();
  await history.getByLabel("A day in the cycle").fill("2026-09-27");
  await history.getByLabel("Stars", { exact: true }).fill("9");
  await history.getByLabel("Polychrome", { exact: true }).fill("300");
  await history.getByRole("button", { name: "Save" }).click();

  // Deadly Assault ran 25 Sep – 8 Oct 2026 (every 14 days since January); a full clear is 9 stars.
  // Not Genshin: the smoke journey adds Genshin through the library.
  const row = history.getByRole("row", { name: /25 Sept? – 8 Oct/ });
  await expect(row).toContainText("9");
  await expect(row).toContainText("300 / 300");
  await expect(history.getByText("Best")).toBeVisible();

  const download = page.waitForEvent("download");
  await history.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/deadly-assault.*\.csv$/i);
});
