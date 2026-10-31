import { expect, test } from "@playwright/test";

// Round 26 (Georges, 2026-10-30: "THE TOP CARDS SHOULD BE A CAROUSEL TOO … a more standardized format for the game
// cards"): every card in the strip is one size, the picked one too; two arrows page the row when it overflows the bar.
test("the strip is a carousel: cards of one size, arrows that page them @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  for (const gameKey of ["hsr", "zzz", "wuwa", "nte", "endfield"]) await page.request.post("/api/instances", { data: { gameKey } });
  await page.goto("/?game=hsr");
  const strip = page.getByRole("navigation", { name: "Scope" });
  await expect(strip.getByRole("link", { name: "Honkai: Star Rail" })).toHaveAttribute("aria-current", "page");
  const sizes = await strip.locator(".strip-game").evaluateAll((els) => els.map((el) => `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));
  expect(sizes.length).toBeGreaterThanOrEqual(5);
  expect(new Set(sizes).size, sizes.join(" ")).toBe(1);

  // Narrower than the row: Later pages it on, Earlier brings it back.
  const earlier = strip.getByRole("button", { name: "Earlier games" });
  const later = strip.getByRole("button", { name: "Later games" });
  await page.setViewportSize({ width: 1000, height: 900 });
  await expect(later).toBeEnabled();
  await expect(earlier).toBeDisabled();
  await later.click();
  const row = strip.locator(".strip-games");
  await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await expect(earlier).toBeEnabled();
  await earlier.click();
  await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBe(0);

  // Round 27 (Georges: "the top carousel should be draggable not just pressing arrows"): a drag across the row scrolls
  // it; the card under the pointer does not open.
  const before = page.url();
  const rowBox = (await row.boundingBox())!;
  const [x, y] = [rowBox.x + rowBox.width - 40, rowBox.y + rowBox.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 200, y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50);
  expect(page.url()).toBe(before);
  // Round 28 (Georges: "card carousel dragging is too robotic, i need it smooth"): nothing snaps, and the row keeps
  // gliding after the release, past where the drag left it.
  expect(await row.evaluate((el) => getComputedStyle(el).scrollSnapType)).toBe("none");
  await expect.poll(() => row.evaluate((el) => el.scrollLeft), { timeout: 3000 }).toBeGreaterThan(240);
});
