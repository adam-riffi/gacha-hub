import { expect, test } from "@playwright/test";
import { textLines } from "./lines";

// Round 28 (Georges, 2026-10-31: "stacking same line text is unacceptable"): no label, table head, row title or unit name
// breaks onto a second line, on Home, a hub's Overview, Activities, Pulls and Tasks, at 1440 and at 1280.
const LABELS = ".kpi-label, .thead > span, th, .tick-title, .act-title, .featured-name, .odds-tile .kpi-label";

test("labels, table heads and row titles stay on one line across the screens @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const wrapped: string[] = [];
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/", `/games/${id}`, `/games/${id}/activities`, `/games/${id}/pulls`, "/tasks"]) {
      await page.goto(path);
      await expect(page.locator(".card, .graph").first()).toBeVisible();
      for (const cell of await page.locator(LABELS).all()) {
        const words = ((await cell.textContent()) ?? "").trim();
        if (!words || !(await cell.isVisible())) continue;
        if ((await textLines(cell)) > 1) wrapped.push(`${width} ${path}: ${words}`);
      }
    }
  }
  expect(wrapped, wrapped.join("\n")).toEqual([]);
});
