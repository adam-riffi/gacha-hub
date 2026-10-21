import { expect, test } from "@playwright/test";

const SQUARE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const WIDE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAAK0lEQVR4nM3OQQEAIACEMKR/5zOCT1mCnW0jTOIkTuIkTuIkTuIkzt+BlwtLhwQQqnm2VgAAAABJRU5ErkJggg==", "base64");

// Round 17 (Georges: "Give each game a game Icon as well; having the Wuthering Waves title card as the game's logo
// doesn't help me read anything. Icons are cool but should be bigger").
test("a game's icon stands beside its name in the strip and in Home's tables; its logo keeps the big spots @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "nte" } })).json()) as { id: string };
  const put = async (slot: string, buffer: Buffer) => expect((await page.request.put(`/api/art/${slot}`, { multipart: { file: { name: "art.png", mimeType: "image/png", buffer } } })).ok(), slot).toBe(true);
  await put("nte/icon", SQUARE);
  await put("nte/logo", WIDE);

  await page.goto("/");
  // The strip: the square icon, 40 px or more, and the name beside it; never the wordmark.
  const chip = page.locator(".strip-game[aria-label='Neverness to Everness']");
  const icon = chip.locator("img.strip-icon");
  await expect(icon).toBeVisible();
  await expect(chip.locator(".strip-name")).toBeVisible();
  const box = (await icon.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(40);
  expect(Math.abs(box.width - box.height)).toBeLessThan(2);

  // Home's Pulls table names the game with its icon, 32 px or more.
  const pulls = page.locator("section", { has: page.getByRole("heading", { name: "Pulls", exact: true }) });
  const mark = pulls.locator("img.list-mark").first();
  await expect(mark).toBeVisible();
  expect((await mark.boundingBox())!.height).toBeGreaterThanOrEqual(32);

  // The hub's header keeps the logo: the wordmark, wider than twice its height.
  await page.goto(`/games/${id}`);
  const logo = page.locator("img.hub-icon");
  await expect(logo).toBeVisible();
  const logoBox = (await logo.boundingBox())!;
  expect(logoBox.width).toBeGreaterThan(logoBox.height * 2);

  for (const slot of ["nte/icon", "nte/logo"]) await page.request.delete(`/api/art/${slot}`);
});
