import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// Round 25 (Georges, 2026-10-29: "not a fan of the genshin icon", the wiki's wordmark standing in the big spots): the
// big spots (the hub's header, the games card, Home's dailies card) show the owner's uploaded logo, else the game's
// icon; a logo from a source never stands in, however the icon may.
test("with an empty store the big spots show the game's icon, never a source's wordmark; an uploaded logo still takes them @smoke", async ({ page }) => {
  await page.route(/mzstatic\.com|fandom\.com|wikia\.nocookie\.net/, (route) => route.fulfill({ body: PNG, contentType: "image/png" }));
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}`);
    const headMark = page.getByRole("region", { name: "Genshin Impact" }).locator("img.game-mark.is-art").first();
    await expect(headMark).toHaveAttribute("src", /mzstatic\.com/);
    await page.goto("/library");
    await expect(page.getByRole("article", { name: "Genshin Impact" }).locator("img.lib-icon")).toHaveAttribute("src", /mzstatic\.com/);

    // The owner's own logo, uploaded, takes the header.
    expect((await page.request.put("/api/art/genshin/logo", { multipart: { file: { name: "logo.png", mimeType: "image/png", buffer: PNG } } })).ok()).toBe(true);
    await page.goto(`/games/${id}`);
    await expect(page.getByRole("region", { name: "Genshin Impact" }).locator("img.game-mark.is-art").first()).toHaveAttribute("src", /\/uploads\//);
  } finally {
    await page.request.delete("/api/art/genshin/logo");
    await page.request.delete(`/api/instances/${id}`);
  }
});
