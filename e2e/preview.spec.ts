import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const IMAGE = "https://sdk.hoyoverse.com/upload/ann/2026/10/21/e2e-preview.jpg";

// Round 17 (Georges: "the preview card is unreadable for me no icons just text. the banners windows has the same issues").
test("the timeline names each game with its icon and shows a banner's picture on its bar; Home's expiring list shows the game's icon @smoke", async ({ page }) => {
  await page.route("https://sdk.hoyoverse.com/**", (route) => route.fulfill({ contentType: "image/png", body: PNG }));
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "nte" } })).json()) as { id: string };
  expect((await page.request.put("/api/art/nte/icon", { multipart: { file: { name: "art.png", mimeType: "image/png", buffer: PNG } } })).ok()).toBe(true);
  const day = 86_400_000;
  const at = (days: number) => new Date(Date.now() + days * day).toISOString();
  for (const data of [
    { kind: "banners", gameKey: "nte", items: [{ key: "e2e-picture", name: "E2E picture board", kind: "character", startsAt: at(-1), endsAt: at(25), payload: { source: "hoyoverse", annId: 2, image: IMAGE } }] },
    { kind: "events", gameKey: "nte", items: [{ key: "e2e-ending", name: "E2E ending event", startsAt: at(-1), endsAt: at(2) }] },
  ]) {
    expect((await page.request.post("/api/admin/payload", { data })).ok(), data.kind).toBe(true);
  }

  await page.goto("/timeline");
  // The game's row head: its icon, 32 px or more, before its name.
  const label = page.locator(".cal-label", { has: page.getByRole("link", { name: "Neverness to Everness" }) });
  const icon = label.locator("img.cal-game-icon");
  await expect(icon).toBeVisible();
  expect((await icon.boundingBox())!.height).toBeGreaterThanOrEqual(32);
  // The banner's bar carries its picture.
  await expect(page.locator(".cal-bar", { hasText: "E2E picture board" }).locator(`img.cal-thumb[src="${IMAGE}"]`)).toBeVisible();

  await page.goto("/");
  const expiring = page.getByRole("region", { name: "Expiring soon" });
  await expect(expiring.locator(".rw", { hasText: "E2E ending event" }).locator("img.list-mark")).toBeVisible();

  await page.request.delete("/api/admin/banners/nte/e2e-picture");
  await page.request.delete("/api/admin/events/nte/e2e-ending");
  await page.request.delete("/api/art/nte/icon");
  await page.request.delete(`/api/instances/${id}`);
});
