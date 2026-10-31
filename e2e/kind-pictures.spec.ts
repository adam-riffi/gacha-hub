import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// Round 28 (Georges, 2026-10-31: "for the icons try to use game icons specifically"): a banner kind's mark shows the
// game's own ticket picture (the pass the kind spends) once it is up, on the Pulls cards and on Home's pity tiles; the
// drawn glyph only until then.
test("a banner kind's mark is the game's own ticket picture once it is up @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const slots = (await (await page.request.get("/api/art")).json()) as { slots: { key: string }[] };
  const tickets = slots.slots.filter((slot) => slot.key.startsWith("hsr/currency/")).map((slot) => slot.key);
  expect(tickets.length).toBeGreaterThan(0);
  for (const key of tickets) expect((await page.request.put(`/api/art/${key}`, { multipart: { file: { name: "ticket.png", mimeType: "image/png", buffer: PNG } } })).ok(), key).toBe(true);
  try {
    await page.goto(`/games/${id}/pulls`);
    const mark = page.getByRole("region", { name: "Character event warp" }).locator(".kind-mark img.kind-art").first();
    await expect(mark).toBeVisible();
    expect(await mark.getAttribute("src")).toMatch(/^\/uploads\//);
    await expect(page.getByRole("region", { name: "Stellar warp" }).locator(".kind-mark img.kind-art").first()).toBeVisible();
    await page.goto("/");
    await expect(page.locator(".pulls-card .pull-pity-kind img.kind-art").first()).toBeVisible();
  } finally {
    for (const key of tickets) await page.request.delete(`/api/art/${key}`);
  }
});
