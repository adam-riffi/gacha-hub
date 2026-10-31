import { expect, test, type Locator } from "@playwright/test";

// Round 28 (Georges, 2026-10-31: "misaligned text. guaranteed shouldn't move everything. check other cards for similar
// issues"): a row with a trailing tag keeps its columns whether the tag is there or not. On a hub's Pity card the figures
// share one right edge and the meters one left edge, chip or split or nothing after them; on Activities the Cycles rows'
// results share one right edge and their chips another.
const edges = (locator: Locator, side: "left" | "right") => locator.evaluateAll((els, which) => els.map((el) => Math.round(el.getBoundingClientRect()[which as "left" | "right"])), side);

test("rows with a trailing tag keep their columns: the pity rows and the cycles rows @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // The collaboration banner guaranteed at 22: one row carries the chip, the others their split or nothing.
  expect((await page.request.post(`/api/instances/${id}/pulls/calibrate`, { data: { bannerKey: "collab", pity: 22, guaranteed: true } })).ok()).toBe(true);

  await page.goto(`/games/${id}`);
  const pity = page.getByRole("region", { name: "Pity" });
  const rows = pity.locator(".gd-pity");
  await expect(rows.first()).toBeVisible();
  await expect(pity.getByText("guaranteed")).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(3);
  const figures = await edges(rows.locator(".gd-fig"), "right");
  expect(new Set(figures).size, `figures end at ${figures.join(" ")}`).toBe(1);
  const meters = await edges(rows.locator(".gd-meter"), "left");
  expect(new Set(meters).size, `meters start at ${meters.join(" ")}`).toBe(1);

  await page.goto(`/games/${id}/activities`);
  const cycles = page.getByRole("region", { name: "Cycles" });
  const cycleRows = cycles.locator(".act-row");
  await expect(cycleRows.first()).toBeVisible();
  expect(await cycleRows.count()).toBeGreaterThanOrEqual(2);
  const results = await edges(cycleRows.locator("> .font-mono"), "right");
  expect(new Set(results).size, `results end at ${results.join(" ")}`).toBe(1);
  const chips = await edges(cycleRows.locator(".chip"), "right");
  expect(new Set(chips).size, `chips end at ${chips.join(" ")}`).toBe(1);
});
