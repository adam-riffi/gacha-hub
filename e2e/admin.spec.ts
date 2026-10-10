import { expect, test } from "@playwright/test";

test("Admin: an overview of users, games and their content, the latest imports, and the audit log to filter @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  // One upload, so the audit log has an entry to filter.
  const upload = await page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "genshin", items: [{ key: "e2e-admin", name: "E2E admin wish", kind: "character", startsAt: iso(30), endsAt: iso(40) }] } });
  expect(upload.ok()).toBe(true);
  await page.goto("/admin");
  const overview = page.getByRole("region", { name: "Overview" });
  await expect(overview).toContainText("Users");
  await expect(overview).toContainText("Builds");
  const games = page.getByRole("table", { name: "Games and their content" });
  await expect(games.getByRole("row", { name: /Genshin Impact/ }).getByRole("button", { name: "Import feed" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Users" })).toContainText("Dev User");
  await page.getByRole("searchbox", { name: "Filter the audit log" }).fill("e2e-admin");
  await expect(page.getByRole("region", { name: "Audit log" })).toContainText("genshin/e2e-admin");
  await page.getByRole("searchbox", { name: "Filter the audit log" }).fill("no-such-entry-anywhere");
  await expect(page.getByRole("region", { name: "Audit log" })).toContainText("No entry matches");
  await page.request.delete("/api/admin/banners/genshin/e2e-admin");
});
