import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Settings downloads everything you entered as JSON @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.goto("/settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download my data" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^gacha-hub-export-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await readFile((await download.path())!, "utf8")) as { format: string; user: { username: string } };
  expect(data.format).toBe("gacha-hub/export");
  expect(data.user.username).toBeTruthy();
});
