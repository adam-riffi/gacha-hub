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
  await put("nte/key-art");

  await page.goto("/library");
  // The strip: a square logo stands alone at the wordmarks' height; the name stays for screen readers and hover.
  const chip = page.locator(".strip-game[aria-label='Neverness to Everness']");
  await expect(chip.locator("img.strip-icon")).toBeVisible();
  await expect(chip.locator(".strip-name")).toBeHidden();
  expect((await chip.locator("img.strip-icon").boundingBox())!.height).toBeGreaterThanOrEqual(34);

  // The games list: the title of a game with a logo starts where the title of a game without one does.
  const titleX = async (name: string) => (await page.locator(".lib-row", { has: page.getByRole("heading", { name }) }).getByRole("heading", { name }).boundingBox())!.x;
  expect(Math.abs((await titleX("Neverness to Everness")) - (await titleX("Arknights: Endfield")))).toBeLessThan(2);

  // Its key art is the row's hero.
  await expect(page.locator(".lib-row", { has: page.getByRole("heading", { name: "Neverness to Everness" }) }).locator("img.lib-hero")).toHaveAttribute("src", /\/uploads\//);

  for (const slot of ["nte/logo", "nte/key-art"]) await page.request.delete(`/api/art/${slot}`);
});
