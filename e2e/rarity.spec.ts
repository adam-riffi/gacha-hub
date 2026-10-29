import { expect, test } from "@playwright/test";

// Round 23 (Georges, 2026-10-28: "use icons as well for rarity, try to have every box the same size and add colors"):
// a rarity is a row of stars in its colour (gold for five, purple for four, blue for three), never "★5" in letters,
// on the character cards, the sheet, the ownership tiles and the weapon cards.
test("a rarity is a row of coloured stars on the character cards, the sheet, the ownership tiles and the weapon cards @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const colour = (locator: ReturnType<typeof page.locator>) => locator.first().evaluate((el) => getComputedStyle(el).color);

  await page.goto(`/games/${id}/characters`);
  const kafka = page.getByRole("article", { name: "Kafka" });
  const five = kafka.getByRole("img", { name: "5 stars" });
  await expect(five).toBeVisible();
  expect(await five.locator("svg").count()).toBe(5);
  await expect(kafka).not.toContainText("★5");
  const four = page.getByRole("article", { name: "Sushang" }).getByRole("img", { name: "4 stars" });
  await expect(four).toBeVisible();
  expect(await colour(five)).not.toBe(await colour(four));

  // The sheet's title.
  await kafka.getByRole("link", { name: "Kafka" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Kafka" })).toBeVisible();
  await expect(page.locator(".sh-title").getByRole("img", { name: "5 stars" })).toBeVisible();

  // The ownership grid.
  await page.goto(`/games/${id}/ownership`);
  const tile = page.locator(".rtile", { hasText: "Kafka" }).first();
  await expect(tile.getByRole("img", { name: "5 stars" })).toBeVisible();
  await expect(tile).not.toContainText("★★★★★");

  // The weapon cards.
  await page.goto(`/games/${id}/weapons`);
  const weapon = page.getByRole("article").filter({ has: page.getByRole("img", { name: "5 stars" }) }).first();
  await expect(weapon).toBeVisible();
  await expect(weapon).not.toContainText("★5");
});

// Boxes in one row stand the same height: the Activities cadences, the cycles and version cards, the endgame modes.
test("cards in one row stand the same height: Activities' cadences, its cycles and version cards, the endgame modes @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const heights = async (selector: string) => {
    const boxes = await page.locator(selector).evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
    expect(boxes.length, selector).toBeGreaterThan(1);
    return boxes;
  };
  const same = (values: number[], what: string) => expect(Math.max(...values) - Math.min(...values), `${what}: ${values.join(", ")}`).toBeLessThanOrEqual(1);

  await page.goto(`/games/${id}`);
  await expect(page.getByRole("heading", { name: "Daily" })).toBeVisible();
  same(await heights(".act-cadences > .card"), "cadences");
  same(await heights(".act-bottom > .card"), "cycles and version");

  await page.goto(`/games/${id}/endgame`);
  await expect(page.getByRole("region", { name: "Memory of Chaos" })).toBeVisible();
  // The modes wrap onto rows: every card in the first row.
  const modes = await page.locator(".eg-modes > .eg-mode").evaluateAll((els) => els.map((el) => ({ top: Math.round(el.getBoundingClientRect().top), height: Math.round(el.getBoundingClientRect().height) })));
  const firstRow = modes.filter((box) => box.top === modes[0]!.top);
  expect(firstRow.length).toBeGreaterThan(1);
  same(firstRow.map((box) => box.height), "endgame modes");
});
