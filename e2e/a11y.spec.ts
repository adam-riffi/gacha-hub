import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/library", "/timeline", "/settings"];

test("main pages have no serious accessibility violations @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };

  const found: string[] = [];
  for (const path of [...PAGES, `/games/${id}`, `/games/${id}/pulls`, `/games/${id}/ownership`]) {
    await page.goto(path);
    await expect(page.getByRole("heading").first()).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    for (const v of violations.filter((x) => x.impact === "serious" || x.impact === "critical")) {
      found.push(`${path}: ${v.id} (${v.impact}) ×${v.nodes.length} — ${v.help} :: ${v.nodes.slice(0, 4).map((n) => n.target.join(" ") + (n.any[0]?.data?.contrastRatio ? ` [${n.any[0].data.contrastRatio}:1 ${n.any[0].data.fgColor} on ${n.any[0].data.bgColor}]` : "")).join(" | ")}`);
    }
  }
  expect(found).toEqual([]);
});
