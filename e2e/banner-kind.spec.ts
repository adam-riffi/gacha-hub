import { expect, test } from "@playwright/test";

// Round 23 (Georges, 2026-10-28: "add a character/weapon icon to the banner to better differentiate them"): every banner
// carries a mark of its kind, a character or a weapon drawn large in its own colour, on the Pulls cards, on Home's banner
// card and on the timeline's bars.
test("every banner carries its kind's mark, character and weapon in two colours: Pulls, Home, the timeline @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const upload = await page.request.post("/api/admin/payload", {
    data: {
      kind: "banners",
      gameKey: "hsr",
      items: [
        { key: "e2e-kind-char", name: "E2E kind character warp", kind: "character", startsAt: iso(-1), endsAt: iso(5), featured: [{ catalogId: "1014", kind: "character" }] },
        { key: "e2e-kind-cone", name: "E2E kind light cone warp", kind: "weapon", startsAt: iso(-1), endsAt: iso(5), featured: [{ catalogId: "23001", kind: "weapon" }] },
      ],
    },
  });
  expect(upload.ok()).toBe(true);
  try {
    await page.goto(`/games/${id}/pulls`);
    const character = page.getByRole("region", { name: "Character event warp" }).getByRole("img", { name: "Character banner" });
    const weapon = page.getByRole("region", { name: "Light cone event warp" }).getByRole("img", { name: "Weapon banner" });
    await expect(character).toBeVisible();
    await expect(weapon).toBeVisible();
    await expect(page.getByRole("region", { name: "Stellar warp" }).getByRole("img", { name: "Standard banner" })).toBeVisible();
    const colour = (locator: typeof character) => locator.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await colour(character)).not.toBe(await colour(weapon));
    for (const mark of [character, weapon]) expect((await mark.boundingBox())!.height, "a mark at 32 px or more").toBeGreaterThanOrEqual(32);

    // Home's banner card names the kind of the banner it shows.
    await page.goto("/");
    await expect(page.locator(".banner-card").getByRole("img", { name: /(Character|Weapon) banner/ })).toBeVisible();

    // The timeline: the two banners share a phase, so one bar carries both marks.
    await page.goto("/timeline?game=hsr");
    const bar = page.getByRole("region", { name: "Timeline" }).getByRole("button", { name: /E2E kind character warp \+1/ });
    await expect(bar.getByRole("img", { name: "Character banner" })).toBeVisible();
    await expect(bar.getByRole("img", { name: "Weapon banner" })).toBeVisible();
  } finally {
    for (const key of ["e2e-kind-char", "e2e-kind-cone"]) await page.request.delete(`/api/admin/banners/hsr/${key}`);
  }
});
