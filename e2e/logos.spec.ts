import { expect, test } from "@playwright/test";
import { blockOutsideArt } from "./outside-art";

/** A wide white picture, as a wordmark logo is. */
const WIDE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAAK0lEQVR4nM3OQQEAIACEMKR/5zOCT1mCnW0jTOIkTuIkTuIkTuIkzt+BlwtLhwQQqnm2VgAAAABJRU5ErkJggg==", "base64");
// The mark is measured once it shows: a source's picture gives way to the drawn emblem only after it has failed (round 22).
const box = async (locator: ReturnType<import("@playwright/test").Page["locator"]>) => {
  await expect(locator.first()).toBeVisible();
  return (await locator.first().boundingBox())!;
};

// Round 15 (Georges, 2026-10-20: "make every game icon more visible"): a logo keeps its shape and takes real room; the drawn
// emblem grows the same way where no logo is uploaded.
test("a game's mark shows at a readable size in a square frame in the strip, the games list, the game's header and Home; the emblem grows too @smoke", async ({ page }) => {
  // Round 22: the slots' sources stand in while the store is empty; refused here, so the marks below are the drawn ones.
  await blockOutsideArt(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.post("/api/instances", { data: { gameKey: "zzz" } });
  try {
    await page.request.put("/api/art/hsr/logo", { multipart: { file: { name: "logo.png", mimeType: "image/png", buffer: WIDE } } });
    const strip = page.getByRole("navigation", { name: "Scope" });
    const chip = strip.getByRole("link", { name: /Star Rail/ });
    await page.goto("/settings");
    // The strip (round 17: icons there, not wordmarks): the emblem at 44 px, the name beside it, for a game with a logo
    // but no icon (Star Rail here) as for one with neither (Zenless).
    for (const link of [chip, strip.getByRole("link", { name: /Zenless/ })]) {
      expect((await box(link.locator("svg.game-mark"))).height).toBeGreaterThanOrEqual(43);
      await expect(link.locator(".rail-game-name")).toBeVisible();
    }
    // The games list and the game's header show the game's icon, never its logo (round 27, Georges: "use the top icons
    // for the games like paimon for genshin"): with no icon up and the sources refused, the drawn emblem, in a 56 px and
    // a 96 px square frame.
    for (const name of ["Honkai: Star Rail", "Zenless Zone Zero"]) {
      const list = await box(page.getByRole("article", { name }).locator("svg.game-mark"));
      expect(list.height, name).toBeGreaterThanOrEqual(55);
      expect(Math.abs(list.width - list.height), name).toBeLessThanOrEqual(2);
    }
    await page.goto(`/games/${id}/activities`);
    const head = await box(page.getByRole("region", { name: "Honkai: Star Rail" }).locator("svg.game-mark.hub-icon"));
    expect(head.height).toBeGreaterThanOrEqual(95);
    expect(Math.abs(head.width - head.height)).toBeLessThanOrEqual(2);
    // Home, all games: the game's mark beside its name on the Dailies card and in the lists.
    await page.goto("/");
    const dailies = page.locator("section", { has: page.getByRole("heading", { name: "Dailies & weeklies" }) });
    await expect(dailies.locator(".game-mark").first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Stamina" }).locator(".game-mark").first()).toBeVisible();
  } finally {
    await page.request.delete("/api/art/hsr/logo");
  }
});
