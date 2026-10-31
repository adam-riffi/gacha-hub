import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// Round 22 (Georges, 2026-10-27: "still no game icons why is a star the icon for GI instead of the original game icon",
// "why is the game card furina"): while the art store holds nothing, every picture slot shows its source straight away:
// the game's App Store icon in the strip, its wiki's key art on the game card. The sources are answered here with a
// one-pixel picture, so the journey does not depend on them.
test("with an empty art store the strip shows each game's App Store icon and the game card its wiki key art @smoke", async ({ page }) => {
  await page.route(/mzstatic\.com|fandom\.com|wikia\.nocookie\.net/, (route) => route.fulfill({ body: PNG, contentType: "image/png" }));
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.request.post("/api/instances", { data: { gameKey: "genshin" } });
  await page.goto("/library");
  await expect(page.locator(".rail-game[aria-label='Genshin Impact'] img.game-mark.is-art")).toHaveAttribute("src", /mzstatic\.com/);
  await expect(page.locator("img.hero-art.lib-hero").first()).toHaveAttribute("src", /fandom\.com|wikia\.nocookie\.net/);
});

// The big spots take the logo; when its source does not answer (Fandom refuses some files), they take the game's icon,
// the picture Georges recognises, and the drawn emblem only when both are missing.
test("a big spot whose logo source does not answer shows the game's icon, not the drawn emblem @smoke", async ({ page }) => {
  // The later route is asked first: the logo's host fails, every other source answers.
  await page.route(/mzstatic\.com|fandom\.com|wikia\.nocookie\.net/, (route) => route.fulfill({ body: PNG, contentType: "image/png" }));
  await page.route(/Genshin-Impact-Logo/, (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.request.post("/api/instances", { data: { gameKey: "genshin" } });
  await page.goto("/library");
  const row = page.getByRole("article", { name: "Genshin Impact" });
  await expect(row.locator("img.game-mark.is-art").first()).toHaveAttribute("src", /mzstatic\.com/);
});
