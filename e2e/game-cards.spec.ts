import { expect, test } from "@playwright/test";

// Round 24 (Georges, 2026-10-29: "the game cards for their main menu are also weird, you can find better cards for them"):
// the games list is a grid of cards, two a row, each with its key art across the top under the game's icon and name,
// then its five figures as tiles of one width, then today's line and the actions.
test("the games list is a grid of cards: key art on top, the icon and name over it, five figure tiles of one width @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // Not Genshin: the smoke journey adds it from the list afterwards.
  for (const gameKey of ["hsr", "zzz"]) await page.request.post("/api/instances", { data: { gameKey } });
  await page.goto("/library");
  const cards = page.getByRole("article");
  await expect(cards.first()).toBeVisible();
  const [first, second] = [(await cards.nth(0).boundingBox())!, (await cards.nth(1).boundingBox())!];
  expect(Math.abs(first.y - second.y), "two cards a row").toBeLessThan(2);
  expect(first.width).toBeGreaterThanOrEqual(500);
  const hsr = page.getByRole("article", { name: "Honkai: Star Rail" });
  const art = (await hsr.locator(".lib-art").boundingBox())!;
  // Round 28 (Georges: "cards are better but it should be bigger still"): a 240 px band, a 90 px icon, a 34 px name.
  expect(art.height, "the key art band").toBeGreaterThanOrEqual(240);
  expect((await hsr.locator(".lib-icon").boundingBox())!.width, "the game's icon").toBeGreaterThanOrEqual(90);
  expect(art.width).toBeGreaterThanOrEqual(first.width - 2);
  const name = (await hsr.getByRole("heading", { name: "Honkai: Star Rail" }).boundingBox())!;
  expect(name.y + name.height, "the name over the art").toBeLessThanOrEqual(art.y + art.height);
  expect(name.height, "the name large").toBeGreaterThanOrEqual(34);
  const cells = await hsr.locator(".lib-cell").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
  expect(cells.length).toBe(5);
  expect(Math.max(...cells) - Math.min(...cells), "tiles of one width").toBeLessThanOrEqual(2);
  expect(parseFloat(await hsr.locator(".lib-cell").first().evaluate((el) => getComputedStyle(el).fontSize)), "the figure large").toBeGreaterThanOrEqual(24);
});
