import { expect, test } from "@playwright/test";

test("logging pulls updates pity and the 50/50 guarantee @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // Idempotent: returns the existing profile when another journey added it.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };

  await page.goto(`/games/${id}/pulls`);
  const banner = page.locator(".pull-banner", { hasText: "Character event wish" });
  await expect(banner.getByTestId("pity")).toHaveText("0");

  await banner.getByRole("button", { name: "+10" }).click();
  await expect(banner.getByTestId("pity")).toHaveText("10");

  await banner.getByRole("button", { name: "Log a 5★" }).click();
  await banner.getByLabel("5★ at pull").fill("7");
  await banner.getByLabel("Featured").uncheck();
  await banner.getByRole("button", { name: "Save 5★" }).click();
  await expect(banner.getByTestId("pity")).toHaveText("3");
  await expect(banner.getByText("Guaranteed")).toBeVisible();
  await expect(banner.locator(".pull-drop")).toContainText("17");
});
