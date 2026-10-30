import { expect, test, type Locator } from "@playwright/test";

/** How many distinct lines a locator's words sit on: 1 when nothing wrapped. */
export const textLines = (locator: Locator) =>
  locator.evaluate((el) => {
    const tops = new Set<number>();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) if (rect.width > 0) tops.add(Math.round(rect.top));
    }
    return tops.size;
  });

// Round 28 (Georges, 2026-10-31: "monthly cards grossly misaligned as well … stacking same line text is unacceptable"):
// every row of a cadence list shares one grid, the 30-day pass row too, so the titles start at one edge; a title or a
// note never breaks onto a second line.
test("the Activities rows share one grid, the pass row too; a title or a note stays on one line @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const long = (await (await page.request.post("/api/tasks", { data: { scope: "game", refId: id, type: "recurring", cadence: "monthly", title: "A monthly item whose long name must stay on one line whatever the card's width", anchorKey: "embers" } })).json()) as { id: string };
  try {
    await page.goto(`/games/${id}/activities`);
    const monthly = page.getByRole("region", { name: "Monthly" });
    const rows = monthly.locator(".tick-row");
    await expect(rows.first()).toBeVisible();
    const pass = monthly.locator(".tick-row", { hasText: "Express Supply Pass" });
    await expect(pass).toHaveCount(1);
    const titleEdges = await rows.locator(".tick-title").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
    expect(new Set(titleEdges).size, `titles start at ${titleEdges.join(" ")}`).toBe(1);
    for (const cell of await monthly.locator(".tick-title, .tick-row .font-mono").all()) {
      const words = ((await cell.textContent()) ?? "").trim();
      if (words) expect(await textLines(cell), words).toBe(1); // a number field's wrapper has no words
    }
    await expect(rows.filter({ hasText: "A monthly item whose long name" }).locator(".font-mono.text-muted")).toHaveText("Embers Exchange");
  } finally {
    await page.request.delete(`/api/tasks/${long.id}`);
  }
});

// Round 28 (Georges: "daily weekly missions rectangular while everything else is square"): a counted task's steps are
// squares, like every other box on the lists.
test("a counted task's steps are squares @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // Zenless: its Daily Missions count four.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  await page.goto(`/games/${id}/activities`);
  const steps = page.getByRole("region", { name: "Daily" }).getByRole("group", { name: "Daily Missions" }).locator(".tick-step");
  await expect(steps.first()).toBeVisible();
  const sizes = await steps.evaluateAll((els) => els.map((el) => [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)]));
  expect(sizes.length).toBeGreaterThanOrEqual(2);
  for (const [width, height] of sizes) {
    expect(width, `${width}x${height}`).toBeGreaterThanOrEqual(20);
    expect(Math.abs(width! - height!), `${width}x${height}`).toBeLessThanOrEqual(1);
  }
});
