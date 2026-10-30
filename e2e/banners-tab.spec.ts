import { expect, test } from "@playwright/test";

const ENDS = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

// Round 24 (Georges, 2026-10-29: "the banners tab is a bit catastrophic"): the timeline's bars stand 48 px tall with 15 px
// text, a banner's bar named by its featured units rather than the phase; the List view is big rows, soonest end first,
// each with the units or the picture, and the day it ends.
test("the banners tab reads: tall bars named by their featured units, and a list of big rows ending soonest first @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const endsAt = iso(5);
  const seeded = await Promise.all([
    page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-tab-warp", name: "E2E tab warp", kind: "character", startsAt: iso(-1), endsAt, featured: [{ catalogId: "1205", kind: "character", rateUp: true }] }] } }),
    page.request.post("/api/admin/payload", { data: { kind: "events", gameKey: "hsr", items: [{ key: "e2e-tab-event", name: "E2E tab event", startsAt: iso(-1), endsAt: iso(4) }] } }),
  ]);
  expect(seeded.every((response) => response.ok())).toBe(true);
  try {
    await page.goto(`/timeline?game=hsr`);
    const timeline = page.getByRole("region", { name: "Timeline" });
    const bar = timeline.getByTitle(/E2E tab warp/);
    await expect(bar).toBeVisible();
    expect((await bar.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(parseFloat(await bar.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    await expect(bar).toContainText("Blade");
    await expect(bar).not.toContainText("E2E tab warp");

    await page.getByRole("group", { name: "View" }).getByRole("button", { name: "List" }).click();
    const list = page.getByRole("region", { name: "List" });
    const rows = list.getByRole("button");
    const warp = rows.filter({ hasText: "Blade" }).first();
    await expect(warp).toBeVisible();
    expect((await warp.boundingBox())!.height).toBeGreaterThanOrEqual(64);
    await expect(warp).toContainText(`Ends ${ENDS.format(new Date(endsAt))}`);
    await expect(warp).not.toContainText("E2E tab warp");
    // The events on their own screen (round 27): its list holds the event and not the warp.
    const show = page.getByRole("group", { name: "Show" });
    await show.getByRole("button", { name: "Events" }).click();
    const event = rows.filter({ hasText: "E2E tab event" }).first();
    await expect(event).toBeVisible();
    await expect(rows.filter({ hasText: "Blade" })).toHaveCount(0);
    await show.getByRole("button", { name: "Banners" }).click();
    await warp.click();
    await expect(page.getByRole("complementary", { name: "Selected" })).toContainText("Blade");
  } finally {
    await page.request.delete("/api/admin/banners/hsr/e2e-tab-warp");
    await page.request.delete("/api/admin/events/hsr/e2e-tab-event");
  }
});
