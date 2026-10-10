import { expect, test } from "@playwright/test";

test("a game's Endgame tab: this cycle's rewards, a card per mode to type results in, upcoming resets @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "zzz" } });
  const { id } = (await created.json()) as { id: string };

  await page.goto(`/games/${id}`);
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Endgame" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/endgame$`));

  const assault = page.getByRole("region", { name: "Deadly Assault" });
  await assault.getByRole("button", { name: "Update Deadly Assault" }).click();
  await assault.getByLabel("Stars", { exact: true }).fill("6");
  await assault.getByLabel("Polychrome", { exact: true }).fill("200");
  await assault.getByRole("button", { name: "Save" }).click();
  await expect(assault).toContainText("6 / 9");
  await expect(assault).toContainText("200 / 300");

  // This cycle adds up what the open cycles offer: 780 + 300.
  await expect(page.getByRole("region", { name: "This cycle" })).toContainText("/ 1,080");
  const upcoming = page.getByRole("region", { name: "Upcoming resets" });
  for (const mode of ["Shiyu Defense", "Deadly Assault"]) await expect(upcoming).toContainText(mode);

  // Activities shows the result too.
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Activities" }).click();
  await expect(page.getByRole("region", { name: "Cycles" })).toContainText("6 / 9");
});
