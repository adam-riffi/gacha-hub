import { expect, test } from "@playwright/test";

// Round 25 (Georges, 2026-10-29: "try to find icons for iconless tasks … maybe 0 icons can be justified", "the version
// card is broken and unreadable"), then round 26 ("some weird useless icons here and there"): a task without a picture
// keeps its frame and draws nothing in it; the date chips carry no square; the games cards no grip; a monthly task's
// shop note wraps rather than squeezing the title; the version card's event rows stand 56 px or taller.
test("a task without a picture keeps an empty frame; no decorative squares or grips; the shop note wraps; the event rows read @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const seeded = await page.request.post("/api/admin/payload", { data: { kind: "events", gameKey: "hsr", items: [{ key: "e2e-rows-event", name: "E2E rows event with a long enough name to wrap", startsAt: iso(-1), endsAt: iso(4) }] } });
  expect(seeded.ok()).toBe(true);
  try {
    await page.goto(`/games/${id}`);
    // Check-in has no picture in any source: its frame stays, empty, so the rows keep one shape; nothing drawn in it.
    const checkIn = page.locator(".tick-row", { hasText: "Check-in" }).first();
    await expect(checkIn).toBeVisible();
    await expect(checkIn.locator("span.list-art:empty")).toHaveCount(1);
    await expect(checkIn.locator(".list-art svg")).toHaveCount(0);
    expect((await checkIn.locator("span.list-art").boundingBox())!.width).toBeGreaterThanOrEqual(36);
    // The date chips (the version's end, the resets) are their words alone: no square before them.
    await expect(page.locator(".chip > i")).toHaveCount(0);
    // Every task row's title stays on one line beside its note.
    for (const row of await page.locator(".act-list .tick-row").all()) {
      const title = (await row.locator(".tick-title").boundingBox())!;
      expect(title.height, (await row.locator(".tick-title").textContent()) ?? "").toBeLessThanOrEqual(40);
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
    await page.goto("/library");
    await expect(page.getByRole("article", { name: "Honkai: Star Rail" })).toBeVisible();
    await expect(page.locator(".lib-grip")).toHaveCount(0);
  } finally {
    await page.request.delete("/api/admin/events/hsr/e2e-rows-event");
  }
});
