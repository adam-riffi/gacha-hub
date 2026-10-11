import { expect, test } from "@playwright/test";

test("Games library: owned characters, pulls, energy, goals and backlog per game, each opening its screen; today, sleep, and moving a game in the strip @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
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
  const strip = page.getByRole("navigation", { name: "Scope" }).locator(".strip-games").getByRole("link");
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
