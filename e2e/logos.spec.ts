import { expect, test } from "@playwright/test";

/** A wide white picture, as a wordmark logo is. */
const WIDE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAAK0lEQVR4nM3OQQEAIACEMKR/5zOCT1mCnW0jTOIkTuIkTuIkTuIkzt+BlwtLhwQQqnm2VgAAAABJRU5ErkJggg==", "base64");
const box = async (locator: ReturnType<import("@playwright/test").Page["locator"]>) => (await locator.first().boundingBox())!;

// Round 15 (Georges, 2026-10-20: "make every game icon more visible"): a logo keeps its shape and takes real room; the drawn
// emblem grows the same way where no logo is uploaded.
test("a game's logo shows at a readable size in the strip, the games list, the game's header and Home; the emblem grows too @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.post("/api/instances", { data: { gameKey: "zzz" } });
  try {
    await page.request.put("/api/art/hsr/logo", { multipart: { file: { name: "logo.png", mimeType: "image/png", buffer: WIDE } } });
    const strip = page.getByRole("navigation", { name: "Scope" });
    const chip = strip.getByRole("link", { name: /Star Rail/ });
    await page.goto("/library");
    // The strip: the logo at 30 px high and wider than high; an emblem (Zenless, no logo) at 30 px too.
    const logo = await box(chip.locator("img.game-mark.is-art"));
    expect(logo.height).toBeGreaterThanOrEqual(29);
    expect(logo.width).toBeGreaterThan(logo.height * 2);
    const emblem = await box(strip.getByRole("link", { name: /Zenless/ }).locator("svg.game-mark"));
    expect(emblem.height).toBeGreaterThanOrEqual(29);
    // The games list: 56 px high.
    expect((await box(page.getByRole("article", { name: "Honkai: Star Rail" }).locator("img.game-mark.is-art"))).height).toBeGreaterThanOrEqual(55);
    expect((await box(page.getByRole("article", { name: "Zenless Zone Zero" }).locator("svg.game-mark"))).height).toBeGreaterThanOrEqual(55);
    // The game's header: 96 px high, its shape kept.
    await page.goto(`/games/${id}`);
    const head = await box(page.getByRole("region", { name: "Honkai: Star Rail" }).locator("img.game-mark.is-art"));
    expect(head.height).toBeGreaterThanOrEqual(95);
    expect(head.width).toBeGreaterThan(head.height * 2);
    // Home: the game's mark beside its name on the Dailies card and in the lists.
    await page.goto("/?game=hsr");
    await expect(page.getByRole("region", { name: "Dailies & weeklies" }).locator(".game-mark").first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Stamina" }).locator(".game-mark").first()).toBeVisible();
  } finally {
    await page.request.delete("/api/art/hsr/logo");
  }
});
