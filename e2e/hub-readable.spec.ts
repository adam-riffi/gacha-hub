import { expect, test } from "@playwright/test";

/** The alpha of a computed colour: "rgb(…)", "rgba(…, a)" or "color(srgb … / a)" (what color-mix computes to). */
const alpha = (color: string) => {
  const slash = /\/\s*([\d.]+%?)\s*\)$/.exec(color);
  if (slash) return slash[1]!.endsWith("%") ? Number(slash[1]!.slice(0, -1)) / 100 : Number(slash[1]);
  const comma = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/.exec(color);
  if (comma) return Number(comma[1]);
  return /^(rgb|color)\(/.test(color) ? 1 : 0;
};

// Round 25 (Georges, 2026-10-29: "some info on transparent cards isn't readable", "weird slider on the games panel for
// activities endgame etc", "the resin full is very small and far", "some alignment issues"): the header's chips and
// reset box stand on a solid ground over the key art, the tab row wraps and never scrolls, the stamina's FULL mark is
// large and beside the figure, and the games cards' TODAY label sits on its line's baseline.
test("the hub header reads over its art, its tabs never scroll, FULL stands large beside the figure, TODAY on its baseline @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/trailblazePower`, { data: { value: 300 } });
  try {
    await page.goto(`/games/${id}`);
    const head = page.getByRole("region", { name: "Honkai: Star Rail" });
    // Round 27 (Georges: "i wanna be able to see [the art] as well as see the info + i don't need my region + UID at all
    // times, use the top icons"): the icon, the name and the resets on a solid block at the left; the key art whole on
    // the right of it; no server or UID chip.
    const block = head.locator(".hub-block");
    expect(alpha(await block.evaluate((el) => getComputedStyle(el).backgroundColor)), "a solid block").toBeGreaterThanOrEqual(0.95);
    const [blockBox, artBox] = [(await block.boundingBox())!, (await head.locator(".hub-hero").boundingBox())!];
    expect(artBox.x, "the art beside the block").toBeGreaterThanOrEqual(blockBox.x + blockBox.width - 40);
    expect(artBox.width, "the art wide enough to see").toBeGreaterThanOrEqual(400);
    await expect(block.locator(".hub-resets")).toBeVisible();
    await expect(head.getByText(/UTC\+1/)).toHaveCount(0);
    const icon = (await head.locator(".hub-icon").boundingBox())!;
    expect(Math.abs(icon.width - icon.height)).toBeLessThanOrEqual(2);
    expect(icon.height).toBeGreaterThanOrEqual(95);
    const tabs = page.getByRole("navigation", { name: "Game screens" });
    expect(await tabs.evaluate((el) => getComputedStyle(el).overflowX)).not.toMatch(/auto|scroll/);
    expect(await tabs.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

    const stamina = page.getByRole("region", { name: "Trailblaze Power" });
    const full = stamina.getByText("Full", { exact: true });
    await expect(full).toBeVisible();
    expect(parseFloat(await full.evaluate((el) => getComputedStyle(el).fontSize)), "FULL large").toBeGreaterThanOrEqual(15);
    const figure = (await stamina.locator(".kpi-value").first().boundingBox())!;
    const mark = (await full.boundingBox())!;
    expect(mark.x - (figure.x + figure.width), "FULL beside the figure").toBeLessThanOrEqual(120);
    expect(Math.abs(mark.y + mark.height / 2 - (figure.y + figure.height / 2)), "on the figure's line").toBeLessThanOrEqual(24);

    await page.goto("/library");
    const today = page.getByRole("article", { name: "Honkai: Star Rail" }).locator(".lib-today");
    const label = (await today.locator(".kpi-label").boundingBox())!;
    const text = (await today.locator("span").last().boundingBox())!;
    expect(Math.abs(label.y + label.height - (text.y + text.height)), "TODAY on the line's baseline").toBeLessThanOrEqual(3);
  } finally {
    await page.request.put(`/api/instances/${id}/currencies/trailblazePower`, { data: { value: 0 } });
  }
});
