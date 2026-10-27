import { expect, test } from "@playwright/test";

// Round 18 (the plan's audits round; Georges, round 15: desktop windows from 1100 to 2560 px, no phones): every screen fits
// an 1100 px window without a horizontal scroll, and still at 2560.
test.use({ viewport: { width: 1100, height: 900 } });

test("every screen fits an 1100 px window: Home, the library, the timeline, Tasks, Settings, each of a game's tabs and a character sheet @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005" } })).json()) as { id: string };
  const tabs = ["", "/characters", "/pulls", "/endgame", "/teams", "/weapons", "/gear", "/materials", "/planner", "/profile", "/ownership"];
  for (const path of ["/", "/?game=hsr", "/library", "/timeline", "/tasks", "/settings", "/settings/data", "/settings/art", "/settings/keys", ...tabs.map((tab) => `/games/${id}${tab}`), `/characters/${build.id}`]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, path).toBeLessThanOrEqual(1100);
  }
});

// Round 22 (Georges, 2026-10-27: "the responsiveness make the whole app unreadable"): a zoomed browser gives a 1920 px screen
// 1280 CSS px at 150 % and 960 at 200 %. Nothing shrinks any more: Home's top row and heatmap keep their size and wrap or
// scroll inside their card; every screen fits 960 px without a horizontal page scroll.
test.describe("a zoomed browser", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test("at 1280 px nothing on Home is zoomed down @smoke", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
    await page.goto("/");
    await expect(page.locator(".home-top")).toBeVisible();
    await page.waitForLoadState("networkidle");
    const zooms = await page.evaluate(() => [".home-top", ".home-heat", ".shell"].flatMap((selector) => { const element = document.querySelector(selector); return element ? [[selector, String(getComputedStyle(element).zoom)]] : []; }));
    expect(zooms.map(([selector]) => selector)).toContain(".home-top");
    for (const [selector, zoom] of zooms) expect(["1", "normal", ""].includes(zoom), `${selector} zoom ${zoom}`).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  });
});

test.describe("a 960 px window (200 % zoom on a 1920 px screen)", () => {
  test.use({ viewport: { width: 960, height: 900 } });
  test("every screen fits without a horizontal page scroll @smoke", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
    const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005" } })).json()) as { id: string };
    const tabs = ["", "/characters", "/pulls", "/endgame", "/teams", "/weapons", "/gear", "/materials", "/planner", "/profile", "/ownership"];
    for (const path of ["/", "/?game=hsr", "/library", "/timeline", "/tasks", "/settings", "/settings/keys", ...tabs.map((tab) => `/games/${id}${tab}`), `/characters/${build.id}`]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(960);
    }
  });
});

test.describe("a 2560 px window", () => {
  test.use({ viewport: { width: 2560, height: 1400 } });
  test("Home and a game's Activities fill it without a horizontal scroll @smoke", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
    for (const path of ["/", `/games/${id}`]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(2560);
    }
  });
});
