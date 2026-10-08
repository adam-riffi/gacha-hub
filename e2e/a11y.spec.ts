import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/library", "/timeline", "/settings", "/admin"];

test("main pages have no serious accessibility violations @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };

  const created = await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1001" } });
  expect(created.ok(), await created.text()).toBe(true);
  const build = (await created.json()) as { id: string };

  const found: string[] = [];
  const game = ["", "/pulls", "/ownership", "/equipment", "/materials", "/gear"].map((p) => `/games/${id}${p}`);
  for (const path of [...PAGES, ...game, `/characters/${build.id}`]) {
    await page.goto(path);
    await expect(page.getByRole("heading").first(), path).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    for (const v of violations.filter((x) => x.impact === "serious" || x.impact === "critical")) {
      found.push(`${path}: ${v.id} (${v.impact}) ×${v.nodes.length} — ${v.help} :: ${v.nodes.slice(0, 4).map((n) => n.target.join(" ") + (n.any[0]?.data?.contrastRatio ? ` [${n.any[0].data.contrastRatio}:1 ${n.any[0].data.fgColor} on ${n.any[0].data.bgColor}]` : "")).join(" | ")}`);
    }
  }
  expect(found).toEqual([]);
});
