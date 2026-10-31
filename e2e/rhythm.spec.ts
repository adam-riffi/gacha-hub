import { expect, test } from "@playwright/test";

// Round 23 (Georges, 2026-10-28: "the layout of certain pages is weird. the big game cards are too close to the activities
// endgame pulls etc panels"): the game's header card keeps its distance from the bar above it and from the first panel,
// and the tabs read at a size for him. Round 29: the tabs sit in the top bar, above the header.
test("the game header keeps its distance: a gap under the top bar's tabs, tabs at 15 px or more, a gap before the first panel @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto(`/games/${id}/activities`);
  const tabs = page.getByRole("navigation", { name: "Game screens" });
  await expect(tabs.getByRole("link", { name: "Endgame" })).toBeVisible();
  const head = page.locator(".hub-head");
  const headBox = (await head.boundingBox())!;
  const tabsBox = (await tabs.boundingBox())!;
  expect(headBox.y - (tabsBox.y + tabsBox.height), "tabs to the header").toBeGreaterThanOrEqual(8);
  expect(parseFloat(await tabs.getByRole("link").first().evaluate((el) => getComputedStyle(el).fontSize)), "tab size").toBeGreaterThanOrEqual(15);
  // The first panel: whatever follows the header (or its wrapper) in the page.
  const firstPanelTop = await head.evaluate((el) => {
    let node: Element | null = el;
    while (node && !node.nextElementSibling) node = node.parentElement;
    return node!.nextElementSibling!.getBoundingClientRect().top;
  });
  expect(firstPanelTop - (headBox.y + headBox.height), "header to the first panel").toBeGreaterThanOrEqual(28);
});

// The games list (the same complaint): every figure tile sits inside its row, none cut at the row's edge, and the
// "Add a game" note takes a row under the list instead of a column that squeezes it.
test("the games list keeps every figure tile inside its row and the add-a-game card under the list @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // Not Genshin: the smoke journey, which runs after this one, adds it from the list and needs it absent.
  for (const gameKey of ["hsr", "zzz"]) await page.request.post("/api/instances", { data: { gameKey } });
  await page.goto("/library");
  const rows = page.getByRole("article");
  await expect(rows.first()).toBeVisible();
  for (const row of await rows.all()) {
    const rowBox = (await row.boundingBox())!;
    for (const cell of await row.locator(".lib-cell").all()) {
      const cellBox = (await cell.boundingBox())!;
      expect(cellBox.x + cellBox.width, `${await row.getAttribute("aria-label")}: ${await cell.locator(".kpi-label").textContent()}`).toBeLessThanOrEqual(rowBox.x + rowBox.width); // round 24: the tiles run edge to edge inside the card
    }
  }
  const list = (await page.locator(".lib-list").boundingBox())!;
  const side = (await page.getByRole("region", { name: "Add a game" }).boundingBox())!;
  expect(side.y, "the add-a-game card under the list").toBeGreaterThanOrEqual(list.y + list.height - 1);
});
