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
      items: [{ key: "e2e-key-art", name: "E2E key art warp", kind: "character", startsAt: new Date(Date.now() - day).toISOString(), endsAt: new Date(Date.now() + 5 * day).toISOString(), payload: { source: "hoyoverse", annId: 1, image: IMAGE } }],
    },
  });
  expect(upload.ok()).toBe(true);

  await page.goto("/");
  const banners = page.locator("section", { has: page.getByRole("heading", { name: "Banners", exact: true }) });
  await expect(banners.locator(`img.key-art[src="${IMAGE}"]`)).toBeVisible();

  await page.goto(`/games/${id}/pulls`);
  await expect(page.locator(`section.pl-banner img.key-art[src="${IMAGE}"]`).first()).toBeVisible();

  await page.goto("/timeline");
  await page.locator(".cal-name", { hasText: "E2E key art warp" }).first().click();
  await expect(page.getByRole("complementary", { name: "Selected" }).locator(`img.key-art[src="${IMAGE}"]`)).toBeVisible();
});
