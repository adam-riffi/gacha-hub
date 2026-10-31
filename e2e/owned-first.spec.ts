import { expect, test } from "@playwright/test";

// Round 28 (Georges, 2026-10-31: "owned things should come on top every time whether its chars or weapons … the background
// of the weapons makes it hard to look at the weapons"): on the ownership grid the owned tiles come first, characters and
// weapons alike; a tile's picture sits on its rarity's tint, and one not owned is never dimmed below 60 %.
test("owned tiles first on the ownership grid, characters and weapons alike; an unowned picture stays readable @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // Welt (1004) owned: he sits late in the catalog's order.
  expect((await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1004", owned: true }] } })).ok()).toBe(true);
  const tiles = page.locator(".roster .rtile");
  const states = () => tiles.evaluateAll((els) => els.map((el) => (el.classList.contains("off") ? "off" : "on")));
  const ownedFirst = (list: string[]) => !list.includes("off") || !list.includes("on") || list.lastIndexOf("on") < list.indexOf("off");

  await page.goto(`/games/${id}/ownership`);
  await expect(tiles.first()).toBeVisible();
  const characters = await states();
  expect(characters).toContain("on");
  expect(characters).toContain("off");
  expect(ownedFirst(characters), characters.join(" ")).toBe(true);
  await expect(tiles.filter({ hasText: "Welt" }).first()).not.toHaveClass(/off/);
  // The picture on the rarity's tint: a 5★ tile's and a 4★ tile's backgrounds differ; an unowned picture at 60 % or more.
  const backdrop = (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await backdrop(".rtile.r5 .rtile-art")).not.toBe(await backdrop(".rtile.r4 .rtile-art"));
  expect(await page.locator(".rtile.off .rtile-art .gicon").first().evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThanOrEqual(0.6);

  // Weapons: the last tile of the catalog's order, once owned, moves up among the owned (other journeys may own others).
  await page.getByRole("group", { name: "Show" }).getByRole("button", { name: "Weapons" }).click();
  await expect(tiles.first()).toBeVisible();
  const lastName = (await tiles.last().locator(".rtile-name").textContent())!;
  await tiles.last().locator(".rtile-art").click();
  await expect(tiles.filter({ hasText: lastName }).first()).not.toHaveClass(/off/);
  await page.reload();
  await page.getByRole("group", { name: "Show" }).getByRole("button", { name: "Weapons" }).click();
  await expect(tiles.first()).toBeVisible();
  const weapons = await states();
  const names = await tiles.locator(".rtile-name").allTextContents();
  expect(weapons[names.indexOf(lastName)], lastName).toBe("on");
  expect(names.indexOf(lastName), `${lastName} among the owned block`).toBeLessThan(weapons.includes("off") ? weapons.indexOf("off") : names.length);
  expect(ownedFirst(weapons), weapons.join(" ")).toBe(true);
});
