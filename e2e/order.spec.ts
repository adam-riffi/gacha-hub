import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// Round 16 (Georges: "so many assets are crooked or out of place/order… the whole concept of this project's UI design is
// ICONS FIRST text second").
test("order: a square logo stands alone in the strip, the games list's titles line up, a game's key art is its hero @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  for (const gameKey of ["nte", "endfield"]) await page.request.post("/api/instances", { data: { gameKey } });
  const put = async (slot: string) => expect((await page.request.put(`/api/art/${slot}`, { multipart: { file: { name: "art.png", mimeType: "image/png", buffer: PNG } } })).ok(), slot).toBe(true);
  await put("nte/logo");
  await put("nte/icon");
  await put("nte/key-art");

  await page.goto("/library");
  // The strip (round 17): the game's icon, square, beside its name.
  const chip = page.locator(".rail-game[aria-label='Neverness to Everness']");
  await expect(chip.locator("img.rail-game-icon")).toBeVisible();
  await expect(chip.locator(".rail-game-name")).toBeVisible();
  expect((await chip.locator("img.rail-game-icon").boundingBox())!.height).toBeGreaterThanOrEqual(40);

  // The games list (cards two a row since round 24): the title of a game with a logo starts at the same place in its card as
  // the title of a game without one.
  const titleX = async (name: string) => {
    const card = page.locator(".lib-row", { has: page.getByRole("heading", { name }) });
    return (await card.getByRole("heading", { name }).boundingBox())!.x - (await card.boundingBox())!.x;
  };
  expect(Math.abs((await titleX("Neverness to Everness")) - (await titleX("Arknights: Endfield")))).toBeLessThan(2);

  // Its key art is the row's hero.
  await expect(page.locator(".lib-row", { has: page.getByRole("heading", { name: "Neverness to Everness" }) }).locator("img.lib-hero")).toHaveAttribute("src", /\/uploads\//);

  for (const slot of ["nte/logo", "nte/icon", "nte/key-art"]) await page.request.delete(`/api/art/${slot}`);
});
