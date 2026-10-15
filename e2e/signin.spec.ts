import { expect, test } from "@playwright/test";

// ADR 0010: one owner signs in with the owner password; the journeys' server sets its hash (scripts/e2e-server.mjs).
test("the owner signs in with the owner password, and a wrong one is refused @smoke", async ({ page }) => {
  await page.goto("/");
  const password = page.getByLabel("Owner password");
  await password.fill("not it");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Wrong password");

  await password.fill("e2e-owner-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});
