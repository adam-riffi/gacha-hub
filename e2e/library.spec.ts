import { expect, test } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

test("Games library: owned characters, pulls, energy, goals and backlog per game, each opening its screen; today, sleep, and moving a game in the strip @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR and ZZZ, not Genshin: the smoke journey adds Genshin through the library.
  const { id: hsrId } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.post("/api/instances", { data: { gameKey: "zzz" } });

  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Games", exact: true })).toBeVisible();
  const hsr = page.getByRole("article", { name: "Honkai: Star Rail" });
  // What each game holds (Georges, 2026-10-11), each opening its screen.
  const owned = hsr.getByRole("link", { name: /Owned/ });
  await expect(owned).toContainText(/\d+ \/ \d+/);
  await expect(owned).toHaveAttribute("href", `/games/${hsrId}/characters`);
  await expect(hsr.getByRole("link", { name: /Pulls/ })).toHaveAttribute("href", `/games/${hsrId}/pulls`);
  await expect(hsr.getByRole("link", { name: /Trailblaze Power/ })).toContainText(/\d+ \/ 300/);
  await expect(hsr.getByRole("link", { name: /Goals/ })).toContainText(/\d+/);
  await expect(hsr.getByRole("link", { name: /Backlog/ })).toHaveAttribute("href", "/tasks?game=hsr");
  await expect(hsr).toContainText(/Dailies \d+\/\d+/);
  // The pipeline's words are gone: no manifest, catalog or live data cells, no capabilities card.
  await expect(hsr).not.toContainText("manual tracking");
  await expect(hsr).not.toContainText("HoYoLAB");
  await expect(page.getByRole("region", { name: "Capabilities" })).toHaveCount(0);

  // Moving the last game up swaps it with the one before, in the strip too.
  const strip = page.getByRole("navigation", { name: "Scope" }).locator(".rail-game");
  const before = await strip.allTextContents();
  const rows = page.getByRole("article");
  const last = (await rows.last().getAttribute("aria-label"))!;
  await rows.last().getByRole("button", { name: `Move ${last} up` }).click();
  await expect(strip).toHaveText([...before.slice(0, -2), before.at(-1)!, before.at(-2)!]);

  await hsr.getByRole("checkbox", { name: "Sleep" }).check();
  await expect(hsr).toContainText("Asleep");
  await hsr.getByRole("checkbox", { name: "Sleep" }).uncheck();
  await expect(hsr).not.toContainText("Asleep");
});

// Round 12 (Georges: "add game art to everything you can"): each game's card carries its hero art; round 22: the game's own key
// art from its wiki, straight from the source while the store is empty (the character's splash is the fallback).
test("a game's card in the library carries its hero art @smoke", async ({ page }) => {
  await page.route(/fandom\.com|wikia\.nocookie\.net/, (route) => route.fulfill({ body: PNG, contentType: "image/png" }));
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
  await page.goto("/library");
  const card = page.getByRole("article", { name: "Honkai: Star Rail" });
  await expect(card.locator("img.hero-art:is([src*='fandom.com'], [src*='wikia.nocookie.net'])")).toHaveCount(1);
});

// Round 27 (Georges, 2026-10-30: "on the overview game screen i should be able to click at a card and enter the game not
// a small barely readable card"): a game card's whole art band, 150 px or taller, opens its hub.
test("Games library: a card's art band opens the game's hub @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto("/library");
  const band = page.getByRole("article", { name: "Honkai: Star Rail" }).getByRole("link", { name: "Open Honkai: Star Rail" });
  await expect(band).toBeVisible();
  expect((await band.boundingBox())!.height).toBeGreaterThanOrEqual(150);
  await band.click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}$`));
});
