import { expect, test } from "@playwright/test";

// Round 28 (Georges, 2026-10-31: "the daily card is misaligned and has data too close to the bottom of its card and the
// banner card has useless info like the banner name instead of just showing the banner art and it should be clickable";
// "there are still some old logos here and there"): Home's Banners card is its art, a link to the game's Pulls, your
// chance as a tag; the Dailies card shows the game's icon, never a logo, its head on one line and room under its tiles.
test("Home's Banners card is its art and opens Pulls; the Dailies card shows the icon with room under its tiles @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  // Ends after every banner the other journeys seed, so their carousel orders hold; removed at the end.
  const items = [{ key: "e2e-dash-art", name: "E2E dash warp", kind: "character", startsAt: iso(-1), endsAt: iso(50), featured: [{ catalogId: "1205", kind: "character", rateUp: true }] }];
  expect((await page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "hsr", items } })).ok()).toBe(true);
  try {
    await page.goto("/");
    const card = page.locator(".banner-card");
    await card.hover();
    const showsBlade = async () => ((await card.getByRole("list", { name: "Featured units" }).textContent().catch(() => "")) ?? "").includes("Blade");
    for (let turn = 0; turn < 12 && !(await showsBlade()); turn++) await card.getByRole("button", { name: "Next banner" }).click();
    expect(await showsBlade()).toBe(true);
    await expect(card.locator(".carousel-title")).toHaveCount(0);
    await expect(card).not.toContainText("E2E dash warp");
    const open = card.getByRole("link", { name: "Open Honkai: Star Rail pulls" });
    await expect(open).toBeVisible();
    const [stage, link] = [(await card.locator(".carousel-stage").boundingBox())!, (await open.boundingBox())!];
    expect(link.width * link.height, "the whole art opens Pulls").toBeGreaterThanOrEqual(0.8 * stage.width * stage.height);
    await expect(card.getByTestId("banner-chance")).toHaveText(/^\d+% with \d+ pulls$/);
    await open.click();
    await expect(page).toHaveURL(new RegExp(`/games/${id}/pulls$`));

    await page.goto("/");
    const dailies = page.locator(".dailies-card");
    await dailies.hover();
    for (let turn = 0; turn < 8 && !(await dailies.locator(".dailies-game").textContent())?.includes("Honkai: Star Rail"); turn++) await dailies.getByRole("button", { name: "Next game" }).click();
    const mark = (await dailies.locator(".band-mark").boundingBox())!;
    expect(Math.abs(mark.width - mark.height), "the game's icon, square, never a logo").toBeLessThanOrEqual(2);
    const game = (await dailies.locator(".dailies-game").boundingBox())!;
    const chip = (await dailies.locator(".dailies-head .chip").boundingBox())!;
    expect(Math.abs(game.y + game.height / 2 - (chip.y + chip.height / 2)), "the head on one line").toBeLessThanOrEqual(6);
    const stageBox = (await dailies.locator(".carousel-stage").boundingBox())!;
    const tileBottoms = await dailies.locator(".dailies-kpis .kpi").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().bottom));
    expect(stageBox.y + stageBox.height - Math.max(...tileBottoms), "room under the tiles").toBeGreaterThanOrEqual(24);
  } finally {
    for (const item of items) await page.request.delete(`/api/admin/banners/hsr/${item.key}`);
  }
});
