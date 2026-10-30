import { expect, test } from "@playwright/test";

// Round 23 (Georges, 2026-10-28: "use icons as well for rarity, try to have every box the same size and add colors"),
// then round 26 (2026-10-30: "i'd rather have 5 then a star"): a rarity is its figure and one star in its colour (gold for
// five, purple for four, blue for three), never "★5" in letters, on the character cards, the sheet, the ownership tiles
// and the weapon cards; on a card the rarity, the path and the element stack down the left edge as tiles of one size.
test("a rarity is its figure and one coloured star on the cards, the sheet, the tiles and the weapons; a card's three tiles stack @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const colour = (locator: ReturnType<typeof page.locator>) => locator.first().evaluate((el) => getComputedStyle(el).color);

  await page.goto(`/games/${id}/characters`);
  const kafka = page.getByRole("article", { name: "Kafka" });
  const five = kafka.getByRole("img", { name: "5 stars" });
  await expect(five).toBeVisible();
  expect(await five.locator("svg").count()).toBe(1);
  await expect(five).toHaveText("5");
  await expect(kafka).not.toContainText("★5");
  // Rarity, path, element: one column of square tiles, each at least 36 px, the same left edge, one under the other.
  const tiles = await kafka.locator(".ch-chips > *").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );
  expect(tiles).toHaveLength(3);
  expect(new Set(tiles.map((tile) => tile.x)).size).toBe(1);
  expect(tiles[1]!.y).toBeGreaterThanOrEqual(tiles[0]!.y + tiles[0]!.h);
  expect(tiles[2]!.y).toBeGreaterThanOrEqual(tiles[1]!.y + tiles[1]!.h);
  for (const tile of tiles) {
    expect(tile.h, JSON.stringify(tile)).toBeGreaterThanOrEqual(36);
    expect(Math.abs(tile.w - tile.h), JSON.stringify(tile)).toBeLessThanOrEqual(2);
  }
  const four = page.getByRole("article", { name: "Sushang" }).getByRole("img", { name: "4 stars" });
  await expect(four).toBeVisible();
  expect(await colour(five)).not.toBe(await colour(four));

  // The sheet's title.
  await kafka.getByRole("link", { name: "Kafka" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Kafka" })).toBeVisible();
  await expect(page.locator(".sh-title").getByRole("img", { name: "5 stars" })).toBeVisible();

  // The ownership grid. Round 27 (Georges: "the owned icon should be colored and not grey out a frame + the frame colour
  // should be the rarity"): the frame in the rarity's colour; an owned unit's picture in full colour, one not owned greyed.
  await page.request.put(`/api/instances/${id}/ownership`, { data: { items: [{ kind: "character", catalogId: "1005", owned: true }] } });
  await page.goto(`/games/${id}/ownership`);
  const tile = page.locator(".rtile", { hasText: "Kafka" }).first();
  await expect(tile.getByRole("img", { name: "5 stars" })).toBeVisible();
  await expect(tile).not.toContainText("★★★★★");
  await expect(tile).not.toHaveClass(/\boff\b/);
  const gold = await tile.evaluate((el) => {
    const probe = document.createElement("i");
    probe.style.color = "var(--rarity-5)";
    el.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  expect(await tile.locator(".rtile-art").evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(gold);
  expect(await tile.locator(".rtile-art .gicon").evaluate((el) => getComputedStyle(el).filter)).toBe("none");
  const off = page.locator(".rtile.off").first();
  await expect(off).toBeVisible();
  expect(await off.locator(".rtile-art .gicon").evaluate((el) => getComputedStyle(el).filter)).toMatch(/grayscale/);

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
