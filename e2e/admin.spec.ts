import { expect, test } from "@playwright/test";

// One user, self-hosted (Georges, round 4): no Admin section; its tools are Settings' Data sources,
// a tab like the others (round 5: it opened "a whole new window" with no way back).
test("Settings' data sources: the games and their content, the latest imports, and the log to filter @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  // One upload, so the log has an entry to filter.
  const upload = await page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "genshin", items: [{ key: "e2e-admin", name: "E2E admin wish", kind: "character", startsAt: iso(30), endsAt: iso(40) }] } });
  expect(upload.ok()).toBe(true);
  await page.goto("/settings");
  const tabs = page.getByRole("navigation", { name: "Settings sections" });
  await tabs.getByRole("link", { name: "Data sources" }).click();
  await expect(page).toHaveURL(/\/settings\/data$/);
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Data sources" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Data sources" })).toHaveAttribute("aria-current", "page");
  const overview = page.getByRole("region", { name: "Overview" });
  await expect(overview).toContainText("Builds");
  await expect(overview).not.toContainText("Users");
  await expect(page.getByRole("table", { name: "Users" })).toHaveCount(0);
  const games = page.getByRole("table", { name: "Games and their content" });
  await expect(games.getByRole("row", { name: /Genshin Impact/ }).getByRole("button", { name: "Import feed" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Filter the audit log" }).fill("e2e-admin");
  await expect(page.getByRole("region", { name: "Audit log" })).toContainText("genshin/e2e-admin");
  await page.getByRole("searchbox", { name: "Filter the audit log" }).fill("no-such-entry-anywhere");
  await expect(page.getByRole("region", { name: "Audit log" })).toContainText("No entry matches");
  await page.request.delete("/api/admin/banners/genshin/e2e-admin");
  // The other tabs stay one click away.
  await tabs.getByRole("link", { name: "Games", exact: true }).click();
  await expect(page.getByRole("region", { name: "Games" })).toBeVisible();
  // An old link to Admin lands here.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/settings\/data$/);
});
