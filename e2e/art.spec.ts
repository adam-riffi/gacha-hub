import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// Georges, 2026-10-17: "make me an exhaustive list of assets you need". The list lives in the app: every picture still
// needed, game by game, each taking the owner's upload in place (stored in Vercel Blob, never committed: ADR 0006).
test("Settings → Art: every picture still needed, game by game, each taking an upload in place @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  try {
    await page.goto("/settings");
    await page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Art", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/art$/);

    // Opens on what is still needed: a section per game; what a source has waits under All.
    const genshin = page.getByRole("region", { name: "Genshin Impact" });
    const logo = genshin.getByRole("group", { name: "Genshin Impact logo" });
    await expect(logo).toContainText("Needed");
    await expect(logo).toContainText("256 × 256");
    await expect(genshin.getByRole("group", { name: "Primogems" })).toHaveCount(0);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(genshin.getByRole("group", { name: "Primogems" })).toContainText("From a source");
    await page.getByRole("button", { name: "Needed", exact: true }).click();

    // An upload in place: the picture shows at once and is kept.
    await logo.locator("input[type=file]").setInputFiles({ name: "genshin-logo.png", mimeType: "image/png", buffer: PNG });
    await expect(logo).toContainText("Uploaded");
    await expect(logo.locator("img.art-preview")).toHaveCount(1);
    const slots = (await (await page.request.get("/api/art")).json()) as { slots: { key: string; url: string | null }[] };
    expect(slots.slots.find((slot) => slot.key === "genshin/logo")?.url).toMatch(/^\/uploads\//);

    // Removed: needed again.
    await logo.getByRole("button", { name: "Remove" }).click();
    await expect(logo).toContainText("Needed");
  } finally {
    await page.request.delete("/api/art/genshin/logo");
  }
});
