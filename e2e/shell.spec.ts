import { expect, test, type Page } from "@playwright/test";
import { blockOutsideArt } from "./outside-art";

const accent = (page: Page) =>
  page
    .locator(".shell")
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--accent").trim().toLowerCase());

// Round 29: the top bar moves between the screens, the side bar sets the scope (rail.spec.ts has the shape).
test("the top bar moves between the screens and the side bar sets the scope @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (
    await page.request.post("/api/instances", { data: { gameKey: "hsr" } })
  ).json()) as { id: string };
  await page.goto("/");

  const sections = page.getByRole("navigation", { name: "Sections" });
  const rail = page.getByRole("navigation", { name: "Scope" });
  for (const [name, url] of [
    ["Tasks and goals", /\/tasks$/],
    ["Banners and events", /\/timeline$/],
    ["Home, all games", /\/$/],
  ] as const) {
    await sections.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(sections.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
  }
  await rail.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(rail.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute("aria-current", "page");

  // One user, self-hosted (round 4): no Admin anywhere in the bars; no Games section either (round 29).
  await expect(rail.getByRole("link", { name: "Admin" })).toHaveCount(0);
  await expect(sections.getByRole("link", { name: "Games", exact: true })).toHaveCount(0);

  // On Home the scope is every game; a game in the side bar opens its hub and the accent follows.
  await sections.getByRole("link", { name: "Home, all games" }).click();
  await expect(rail.getByRole("link", { name: "All games" })).toHaveAttribute("aria-current", "page");
  expect(await accent(page)).toBe("#ff2d95");
  await rail.getByRole("link", { name: "Honkai: Star Rail" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}$`));
  await expect(rail.getByRole("link", { name: "Honkai: Star Rail" })).toHaveAttribute("aria-current", "page");
  expect(await accent(page)).toBe("#ff8fd1");

  // From Banners a game leads to its Pulls, where its banners live; ALL brings every game back.
  await rail.getByRole("link", { name: "All games" }).click();
  await sections.getByRole("link", { name: "Banners and events" }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await expect(page.locator(".cal-game-name", { hasText: "Honkai: Star Rail" })).toBeVisible();
  await rail.getByRole("link", { name: "Honkai: Star Rail" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/pulls$`));
  expect(await accent(page)).toBe("#ff8fd1");

  // Tasks holds today's dailies and the board.
  await rail.getByRole("link", { name: "All games" }).click();
  await sections.getByRole("link", { name: "Tasks and goals" }).click();
  await expect(page.getByRole("heading", { name: "Tasks", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

// Georges, round 4: "if I am on the pulls screen of Genshin and I go to HSR I wanna end up on the HSR pull screen".
test("another game in the side bar opens the same tab, or its first where it has none @smoke", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const make = async (gameKey: string) =>
    (
      (await (await page.request.post("/api/instances", { data: { gameKey } })).json()) as {
        id: string;
      }
    ).id;
  const [hsr, zzz, endfield] = [await make("hsr"), await make("zzz"), await make("endfield")];
  const rail = page.getByRole("navigation", { name: "Scope" });

  await page.goto(`/games/${hsr}/pulls`);
  await rail.getByRole("link", { name: "Zenless Zone Zero" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${zzz}/pulls$`));
  await expect(
    page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Pulls" }),
  ).toHaveAttribute("aria-current", "page");

  // Endfield has no Planner: its first tab.
  await page.goto(`/games/${zzz}/planner`);
  await rail.getByRole("link", { name: "Arknights: Endfield" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${endfield}$`));

  // A character's sheet leads to the other game's characters.
  const build = (await (
    await page.request.post(`/api/instances/${hsr}/characters`, { data: { catalogId: "1102" } })
  ).json()) as { id: string };
  try {
    await page.goto(`/characters/${build.id}`);
    await rail.getByRole("link", { name: "Zenless Zone Zero" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${zzz}/characters$`));
  } finally {
    await page.request.delete(`/api/characters/${build.id}`);
  }
});

// Round 7's growing card and round 26's one-size strip are gone (round 29): every game in the side bar is its icon with its
// short name, its full name as its label; the picked one keeps its size; ALL is current on Home and filled.
test("each game in the side bar keeps one size, shows its icon and short name, its full name as its label; ALL current on Home and filled @smoke", async ({
  page,
}) => {
  // Round 22: the slots' sources stand in while the store is empty; refused here, so the marks below are the drawn ones.
  await blockOutsideArt(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
  await page.goto("/");
  const rail = page.getByRole("navigation", { name: "Scope" });
  const hsr = rail.getByRole("link", { name: "Honkai: Star Rail" });
  await expect(hsr).toContainText("Star Rail");
  await expect(hsr).not.toContainText("Honkai");
  // Round 12: the icon is the game's drawn emblem.
  await expect(hsr.locator("svg.game-mark")).toHaveCount(1);
  const before = (await hsr.boundingBox())!;
  await hsr.click();
  await expect(hsr).toHaveAttribute("aria-current", "page");
  await expect(hsr).toHaveAttribute("title", "Honkai: Star Rail");
  const after = (await hsr.boundingBox())!;
  expect(Math.abs(after.width - before.width) + Math.abs(after.height - before.height)).toBeLessThanOrEqual(2);

  // Back on Home from the hub: ALL is current and filled.
  const all = rail.getByRole("link", { name: "All games" });
  await all.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(all).toHaveAttribute("aria-current", "page");
  expect(await all.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
});

// Georges, round 8: "the responsivity of the app is pretty mediocre overall; I'd rather have it not responsive"; round 15:
// desktop windows from 1100 to 2560 px, no phones. Round 22 (a zoomed browser: a 1920 px screen at 150 % is 1280 CSS px, at
// 200 % it is 960): one layout from 1440 up, and below it nothing shrinks: cards keep their width (380 px a character card)
// and wrap onto fewer columns, down to a 900 px floor where the window scrolls sideways instead of rearranging further.
test("One desktop layout: four character columns from 1440, three from 1360, two from 1280 down to 960, and a 900 px floor @smoke", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (
    await page.request.post("/api/instances", { data: { gameKey: "hsr" } })
  ).json()) as { id: string };
  const columns = () =>
    page
      .locator(".ch-grid")
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  const scrollWidth = () => page.evaluate(() => document.documentElement.scrollWidth);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/games/${id}/characters`);
  await expect(page.locator(".ch-grid article").first()).toBeVisible();
  expect(await columns()).toBe(4);

  await page.setViewportSize({ width: 1360, height: 900 });
  await expect.poll(columns).toBe(3);

  for (const width of [1280, 1100, 960]) {
    await page.setViewportSize({ width, height: 800 });
    await expect.poll(columns, `${width} px`).toBe(2);
    expect(await scrollWidth(), `${width} px`).toBeLessThanOrEqual(width);
  }

  await page.setViewportSize({ width: 800, height: 800 });
  await expect.poll(scrollWidth).toBeGreaterThanOrEqual(900);
});
