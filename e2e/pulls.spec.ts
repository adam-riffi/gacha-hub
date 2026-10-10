import { expect, test } from "@playwright/test";

test("Pulls: what you have and what is coming, an event banner's status, pity and odds, logging a 5★ @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library, and
  // journeys share one database. The install call is idempotent.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/stellarJade`, { data: { value: 3200 } });
  await page.request.put(`/api/instances/${id}/currencies/specialPass`, { data: { value: 10 } });

  await page.goto(`/games/${id}/pulls`);
  await expect(page.getByRole("region", { name: "Pulls available" })).toContainText("30");
  await expect(page.getByRole("region", { name: /^By the end of/ })).toContainText("Daily Training");

  const banner = page.getByRole("region", { name: "Character event warp" });
  await expect(banner.getByTestId("pity")).toHaveText("0");
  await expect(banner.getByRole("button", { name: "50/50" })).toHaveAttribute("aria-pressed", "true");
  await expect(banner).toContainText("Next pull");
  await expect(banner.getByRole("img", { name: /chance of the featured 5★/ })).toBeVisible();

  await banner.getByRole("button", { name: "+10" }).click();
  await expect(banner.getByTestId("pity")).toHaveText("10");

  await banner.getByRole("button", { name: "Log a 5★" }).click();
  await banner.getByLabel("5★ at pull").fill("7");
  await banner.getByLabel("Featured", { exact: true }).uncheck();
  await banner.getByRole("button", { name: "Save 5★" }).click();
  await expect(banner.getByTestId("pity")).toHaveText("3");
  await expect(banner.getByRole("button", { name: "Guaranteed" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "History" })).toContainText("17");

  // Home shows the pity next to the game's pulls.
  await page.goto("/");
  await expect(page.locator(".pull-row-pity", { hasText: "Character 3/90" })).toContainText("guaranteed");
});
