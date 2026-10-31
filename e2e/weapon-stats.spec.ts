import { expect, test } from "@playwright/test";

// Round 28 (Georges, 2026-10-31: "the main stats like the atk and crit damage should be shown explicitly on each weapon"):
// every weapon tile on the ownership grid names its stats at its top level, each with its icon, its name and its figure.
test("each weapon tile on the ownership grid shows its max-level stats @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto(`/games/${id}/ownership`);
  await page.getByRole("group", { name: "Show" }).getByRole("button", { name: "Weapons" }).click();
  // Post-Op Conversation at level 80: 1,058 HP, 423 ATK, 331 DEF.
  const tile = page.locator(".rtile", { hasText: "Post-Op Conversation" }).first();
  await expect(tile).toBeVisible();
  const stats = tile.locator(".rtile-stats");
  await expect(stats).toContainText("1058");
  await expect(stats).toContainText("423");
  await expect(stats).toContainText("331");
  await expect(stats).toContainText("HP");
  await expect(stats.locator("svg.stat-icon")).toHaveCount(3);
  // One stat a line, nothing broken across lines.
  const rows = await stats.locator(".rtile-stat").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  expect(rows).toHaveLength(3);
  for (const height of rows) expect(height).toBeLessThanOrEqual(26);
});
