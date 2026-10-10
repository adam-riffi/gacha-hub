import { expect, test } from "@playwright/test";

// DESIGN.md §13: every view has loading, empty and error states. A failed request says so and offers a retry,
// instead of an empty Home or a "Loading…" that never ends.
test("a page whose request fails says so, and Try again recovers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.route("**/api/dashboard", (r) => r.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Home could not load.");
  await page.unroute("**/api/dashboard");
  await page.getByRole("alert").getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  // The game pages that wait on their game: gear, materials and owned units.
  await page.route("**/api/instances/broken", (r) => r.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
  for (const tab of ["gear", "materials", "ownership"]) {
    await page.goto(`/games/broken/${tab}`);
    await expect(page.getByRole("alert").filter({ hasText: "could not load." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  }
});
