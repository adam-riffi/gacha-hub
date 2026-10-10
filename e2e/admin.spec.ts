import { expect, test } from "@playwright/test";

test("Admin: an overview of users, games and their content, the latest imports, and the audit log to filter @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.goto("/admin");
  const overview = page.getByRole("region", { name: "Overview" });
  await expect(overview).toContainText("Users");
  await expect(overview).toContainText("Builds");
  const games = page.getByRole("table", { name: "Games and their content" });
  await expect(games.getByRole("row", { name: /Genshin Impact/ }).getByRole("button", { name: "Import feed" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Users" })).toContainText("Dev User");
  await page.getByRole("searchbox", { name: "Filter the audit log" }).fill("no-such-entry-anywhere");
  await expect(page.getByRole("region", { name: "Audit log" })).toContainText("No entry matches");
});
