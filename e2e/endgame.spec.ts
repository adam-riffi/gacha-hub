import { expect, test } from "@playwright/test";

test("a game's Endgame tab: this cycle's rewards, a card per mode to type results in, upcoming resets @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "zzz" } });
  const { id } = (await created.json()) as { id: string };

  await page.goto(`/games/${id}`);
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Endgame" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/endgame$`));

  const assault = page.getByRole("region", { name: "Deadly Assault" });
  // The cycle window gives its exact reset times, not only the days.
  await expect(assault.getByRole("img", { name: /^Cycle / })).toContainText(/\d{2}:\d{2}[\s\S]*\d{2}:\d{2}/);
  await assault.getByRole("button", { name: "Update Deadly Assault" }).click();
  await assault.getByLabel("Stars", { exact: true }).fill("6");
  await assault.getByLabel("Polychrome", { exact: true }).fill("200");
  await assault.getByRole("button", { name: "Save" }).click();
  await expect(assault).toContainText("6 / 9");
  await expect(assault).toContainText("200 / 300");

  // This cycle adds up what the open cycles offer: 780 + 300.
  const thisCycle = page.getByRole("region", { name: "This cycle" });
  await expect(thisCycle).toContainText("/ 1,080");
  const remind = thisCycle.getByRole("checkbox", { name: "Remind 24 h before reset" });
  await remind.check();
  await page.reload();
  await expect(page.getByRole("region", { name: "This cycle" }).getByRole("checkbox", { name: /Remind 24 h/ })).toBeChecked();
  const upcoming = page.getByRole("region", { name: "Upcoming resets" });
  for (const mode of ["Shiyu Defense", "Deadly Assault"]) await expect(upcoming).toContainText(mode);

  // Activities shows the result too.
  await page.getByRole("navigation", { name: "Game screens" }).getByRole("link", { name: "Activities" }).click();
  await expect(page.getByRole("region", { name: "Cycles" })).toContainText("6 / 9");
});

test("an endgame cycle keeps each half's team and clear time, on its card and in the history @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  await page.goto(`/games/${id}/endgame`);

  const abyss = page.getByRole("region", { name: "Spiral Abyss" });
  await abyss.getByRole("button", { name: "Update Spiral Abyss" }).click();
  await abyss.getByLabel("Stars", { exact: true }).fill("36");
  const first = abyss.getByRole("group", { name: "First half" });
  for (const unit of ["Raiden Shogun", "Bennett"]) {
    await first.getByRole("combobox", { name: "Add to First half" }).fill(unit);
    await first.getByRole("option", { name: unit }).click();
  }
  await first.getByLabel("Clear time").fill("1:35");
  await abyss.getByRole("button", { name: "Save" }).click();

  const clears = abyss.getByRole("list", { name: "Clears" });
  await expect(clears.getByRole("listitem").first()).toContainText("1:35");
  await expect(clears.getByRole("img", { name: "Raiden Shogun" })).toBeVisible();
  const history = page.getByRole("region", { name: "History", exact: true });
  await expect(history.getByRole("img", { name: "Bennett" })).toBeVisible();
  await expect(history).toContainText("1:35");
});

// What each cycle sends at you, where the mode rotates it (Georges, 2026-10-11): Shiyu Defense's frontiers, Deadly Assault's bosses.
test("a rotating endgame mode shows its enemies per stage, with what they are weak to @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  await page.goto(`/games/${id}/endgame`);
  for (const mode of ["Shiyu Defense", "Deadly Assault"]) {
    const enemies = page.getByRole("region", { name: mode }).getByRole("list", { name: "Enemies" });
    await expect(enemies.getByRole("listitem").first()).toBeVisible();
    await expect(enemies.getByRole("img").first()).toBeVisible();
  }
  // Icons where the data has them (Georges, round 4): what Shiyu's stages are weak to as element icons;
  // Deadly Assault's bosses by their icon, named on hover, the label keeping their level.
  const shiyu = page.getByRole("region", { name: "Shiyu Defense" }).getByRole("list", { name: "Enemies" });
  await expect(shiyu.getByRole("img", { name: /^Weak to (Fire|Ice|Electric|Ether|Physical|Wind)$/ }).first()).toBeVisible();
  const boss = page.getByRole("region", { name: "Deadly Assault" }).getByRole("list", { name: "Enemies" }).getByRole("listitem").first();
  await expect(boss.locator(".eg-stage")).toHaveText(/^Lv \d+$/);
  await expect(boss.locator(".eg-enemy").first()).toHaveAttribute("title", /\w/);
  // Modes that do not rotate enemies show none.
  await expect(page.getByRole("list", { name: "Enemies" })).toHaveCount(2);
});

test("Stygian Onslaught shows its three bosses; Spiral Abyss and Imaginarium Theater show no enemies @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "genshin" } })).json()) as { id: string };
  // The smoke journey adds Genshin through the Games page, so this one removes its profile.
  try {
    await page.goto(`/games/${id}/endgame`);
    await expect(page.getByRole("region", { name: "Stygian Onslaught" }).getByRole("list", { name: "Enemies" }).getByRole("listitem")).toHaveCount(3);
    // Each boss's team and time, shown before anything is typed (Georges, round 6: "for Stygian I wanna see my teams, time and difficulty").
    const clears = page.getByRole("region", { name: "Stygian Onslaught" }).getByRole("list", { name: "Clears" });
    await expect(clears.getByRole("listitem")).toHaveCount(3);
    await expect(clears).toContainText("Boss 1");
    await expect(page.getByRole("region", { name: "Stygian Onslaught" })).toContainText("difficulty");
    await expect(page.getByRole("list", { name: "Enemies" })).toHaveCount(1);
  } finally {
    await page.request.delete(`/api/instances/${id}`);
  }
});
