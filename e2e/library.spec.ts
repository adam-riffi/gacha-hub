import { expect, test } from "@playwright/test";

test("Games library: capabilities, today, sleep, and moving a game in the strip @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR and ZZZ, not Genshin: the smoke journey adds Genshin through the library.
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
  await page.request.post("/api/instances", { data: { gameKey: "zzz" } });

  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Games", exact: true })).toBeVisible();
  const hsr = page.getByRole("article", { name: "Honkai: Star Rail" });
  await expect(hsr).toContainText("manual tracking");
  await expect(hsr).toContainText(/\d+ characters/);
  await expect(hsr).toContainText(/Dailies \d+\/\d+/);
  await expect(page.getByRole("article", { name: "Zenless Zone Zero" })).toContainText("no cost data yet");

  // Moving the last game up swaps it with the one before, in the strip too.
  const strip = page.getByRole("navigation", { name: "Scope" }).locator(".strip-games").getByRole("link");
  const before = await strip.allTextContents();
  const rows = page.getByRole("article");
  const last = (await rows.last().getAttribute("aria-label"))!;
  await rows.last().getByRole("button", { name: `Move ${last} up` }).click();
  await expect(strip).toHaveText([...before.slice(0, -2), before.at(-1)!, before.at(-2)!]);

  await hsr.getByRole("checkbox", { name: "Sleep" }).check();
  await expect(hsr).toContainText("Asleep");
  await hsr.getByRole("checkbox", { name: "Sleep" }).uncheck();
  await expect(hsr).not.toContainText("Asleep");
});
