import { expect, test } from "@playwright/test";

// Round 25 (Georges, 2026-10-29: "try to find icons for iconless tasks … maybe 0 icons can be justified", "the version
// card is broken and unreadable"), round 26 ("some weird useless icons here and there"), round 27 ("some are useless and
// some are too small"): a task's picture stands 48 px; a task without one shows no frame at all; the date chips carry no
// square; the games cards no grip; a task's title stays on one line beside its note; the version card's event rows
// stand 56 px or taller.
test("a task's picture is 48 px, a task without one has no frame; no decorative squares or grips; titles on one line; the event rows read @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const seeded = await page.request.post("/api/admin/payload", { data: { kind: "events", gameKey: "hsr", items: [{ key: "e2e-rows-event", name: "E2E rows event with a long enough name to wrap", startsAt: iso(-1), endsAt: iso(4) }] } });
  expect(seeded.ok()).toBe(true);
  try {
    await page.goto(`/games/${id}/activities`);
    // Check-in has no picture in any source: no frame at all (round 27: an empty box is a useless icon).
    const checkIn = page.locator(".tick-row", { hasText: "Check-in" }).first();
    await expect(checkIn).toBeVisible();
    await expect(checkIn.locator(".list-art")).toHaveCount(0);
    // Daily Training has one, at 48 px.
    expect((await page.locator(".tick-row", { hasText: "Daily Training" }).first().locator("img.list-art").boundingBox())!.width).toBeGreaterThanOrEqual(48);
    // The date chips (the version's end, the resets) are their words alone: no square before them.
    await expect(page.locator(".chip > i")).toHaveCount(0);
    // Every task row's title stays on one line beside its note (its words on one line, whatever the picture's height; a cut
    // title's hidden tail is a second box on the same line, so the lines are the distinct tops).
    for (const row of await page.locator(".act-list .tick-row").all()) {
      const lines = await row.locator(".tick-title").evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el.lastChild!);
        return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
      });
      expect(lines, (await row.locator(".tick-title").textContent()) ?? "").toBe(1);
    }
    // A task whose title was recased since (an older profile's "Realm currency") still finds its icon.
    const tasks = (await (await page.request.get(`/api/tasks?scope=game&refId=${id}`)).json()) as { id: string; title: string }[];
    const training = tasks.find((task) => task.title === "Daily Training")!;
    await page.request.put(`/api/tasks/${training.id}`, { data: { title: "Daily training" } });
    await page.reload();
    await expect(page.locator(".tick-row", { hasText: "Daily training" }).first().locator("img.list-art")).toHaveCount(1);
    await page.request.put(`/api/tasks/${training.id}`, { data: { title: "Daily Training" } });
    const eventRow = page.locator(".act-version .act-row", { hasText: "E2E rows event" });
    await expect(eventRow).toBeVisible();
    expect((await eventRow.boundingBox())!.height).toBeGreaterThanOrEqual(56);
    // Home and the games list: no squares in the chips, no grip glyph on the cards.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await expect(page.locator(".chip > i")).toHaveCount(0);
    await page.goto("/settings");
    await expect(page.getByRole("article", { name: "Honkai: Star Rail" })).toBeVisible();
    await expect(page.locator(".lib-grip")).toHaveCount(0);
  } finally {
    await page.request.delete("/api/admin/events/hsr/e2e-rows-event");
  }
});
