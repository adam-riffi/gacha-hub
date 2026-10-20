import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const IMAGE = "https://sdk.hoyoverse.com/upload/ann/2026/10/13/e2e-key-art.jpg";

// Round 16 (Georges: "for banners or game cards you can use real game art"): the key art an announcement came with
// is the banner's picture on Home's Banners card, on its Pulls card and on the timeline's selected panel.
test("a banner's official key art is its picture on Home, Pulls and the timeline @smoke", async ({ page }) => {
  await page.route("https://sdk.hoyoverse.com/**", (route) => route.fulfill({ contentType: "image/png", body: PNG }));
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const day = 86_400_000;
  const upload = await page.request.post("/api/admin/payload", {
    data: {
      kind: "banners",
      gameKey: "hsr",
      // Ends after every banner the other journeys seed on the shared database, so their carousel order holds; removed at the end.
      items: [{ key: "e2e-key-art", name: "E2E key art warp", kind: "character", startsAt: new Date(Date.now() - day).toISOString(), endsAt: new Date(Date.now() + 30 * day).toISOString(), payload: { source: "hoyoverse", annId: 1, image: IMAGE } }],
    },
  });
  expect(upload.ok()).toBe(true);

  await page.goto("/?game=hsr");
  const banners = page.locator("section", { has: page.getByRole("heading", { name: "Banners", exact: true }) });
  const art = banners.locator(`img.key-art[src="${IMAGE}"]`);
  // The card shows the nearest deadline first: step to this banner past the ones other journeys left.
  for (let step = 0; step < 8; step += 1) {
    if (await art.waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false)) break;
    await banners.getByRole("button", { name: "Next banner" }).click();
  }
  await expect(art).toBeVisible();

  await page.goto(`/games/${id}/pulls`);
  await expect(page.locator(`section.pl-banner img.key-art[src="${IMAGE}"]`).first()).toBeVisible();

  await page.goto("/timeline");
  await page.locator(".cal-name", { hasText: "E2E key art warp" }).first().click();
  await expect(page.getByRole("complementary", { name: "Selected" }).locator(`img.key-art[src="${IMAGE}"]`)).toBeVisible();
  expect((await page.request.delete("/api/admin/banners/hsr/e2e-key-art")).ok()).toBe(true);
});
