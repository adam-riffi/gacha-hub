import { expect, test } from "@playwright/test";

// Round 28 (Georges, 2026-10-31: "pull screen with banners should be more accommodating to multiple banners such as when
// you have featured new and rerun characters"; "standardize the way you do banners … the way you did the weapons banner
// was perfect"): when two banners of one kind run, the Pulls card repeats the weapon card's shape for each: its key art
// across, the kind's mark and the banner type once, then each banner's end and its featured units.
test("two running banners of one kind each get their block on the Pulls card @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const featuring = (...catalogIds: string[]) => catalogIds.map((catalogId) => ({ catalogId, kind: "character", rateUp: true }));
  // Both end after every banner the other journeys seed, so their carousel orders hold; removed at the end.
  const items = [
    { key: "e2e-run-new", name: "E2E new warp", kind: "character", startsAt: iso(-1), endsAt: iso(40), featured: featuring("1205", "1001") },
    { key: "e2e-run-rerun", name: "E2E rerun warp", kind: "character", startsAt: iso(-1), endsAt: iso(41), featured: featuring("1009", "1003") },
  ];
  expect((await page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "hsr", items } })).ok()).toBe(true);
  try {
    await page.goto(`/games/${id}/pulls`);
    const card = page.getByRole("region", { name: "Character event warp" });
    const runs = card.locator(".pl-run");
    await expect(runs).toHaveCount(2);
    const first = runs.filter({ hasText: "Blade" });
    await expect(first.getByRole("list", { name: "Featured units" }).getByRole("listitem")).toHaveCount(2);
    await expect(first).toContainText("March 7th");
    await expect(first).not.toContainText("Asta");
    const second = runs.filter({ hasText: "Asta" });
    await expect(second).toContainText("Himeko");
    for (const run of [first, second]) await expect(run.getByText(/^Ends /)).toBeVisible();
    // The kind's mark and the banner type once, on the first block; the blocks stack, the first on top.
    await expect(first.locator(".kind-mark")).toHaveCount(1);
    await expect(first.getByRole("heading", { level: 3 })).toHaveText("Character event warp");
    await expect(second.locator(".kind-mark")).toHaveCount(0);
    await expect(second.getByRole("heading", { level: 3 })).toHaveCount(0);
    expect((await second.boundingBox())!.y).toBeGreaterThan((await first.boundingBox())!.y + (await first.boundingBox())!.height - 2);
    // Never the banners' own names on the card (round 24).
    await expect(card).not.toContainText("E2E new warp");
  } finally {
    for (const item of items) await page.request.delete(`/api/admin/banners/hsr/${item.key}`);
  }
});
