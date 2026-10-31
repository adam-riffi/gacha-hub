import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// Round 17 (Georges: "the pieces of art you've chosen for the top game cards and game window game cards are extremely
// underwhelming"): a game's key art (Settings → Art) fills the hub header beside its block (round 27: whole, not under the
// words) and stands across its games-list row.
test("a game's key art fills the hub header beside its block and its games-list row @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "nte" } })).json()) as { id: string };
  expect((await page.request.put("/api/art/nte/key-art", { multipart: { file: { name: "art.png", mimeType: "image/png", buffer: PNG } } })).ok()).toBe(true);

  await page.goto(`/games/${id}/activities`);
  const hero = page.getByRole("region", { name: "Neverness to Everness" }).locator("img.hub-hero");
  await expect(hero).toHaveAttribute("src", /\/uploads\//);
  const head = (await page.getByRole("region", { name: "Neverness to Everness" }).boundingBox())!;
  const art = (await hero.boundingBox())!;
  expect(art.x + art.width).toBeGreaterThanOrEqual(head.x + head.width - 2); // to the header's right edge
  expect(art.width).toBeGreaterThan(400); // and wide enough to see
  expect(art.height).toBeGreaterThanOrEqual(180);

  await page.goto("/settings");
  const row = page.getByRole("article", { name: "Neverness to Everness" }).locator("img.lib-hero");
  await expect(row).toHaveAttribute("src", /\/uploads\//);
  expect((await row.boundingBox())!.width).toBeGreaterThan(500);

  await page.request.delete("/api/art/nte/key-art");
  // The NTE journey adds the game from the library itself: leave none behind.
  await page.request.delete(`/api/instances/${id}`);
});
