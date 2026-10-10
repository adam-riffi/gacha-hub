import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Serious and critical WCAG 2 A/AA violations on the current page, one line each. */
async function violations(page: Page, label: string): Promise<string[]> {
  await expect(page.getByRole("heading").first()).toBeVisible();
  // Off any hover; under reduced motion nothing animates, so the page is already settled.
  await page.mouse.move(0, 0);
  const { violations: found } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return found
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) =>
        `${label}: ${v.id} (${v.impact}) ×${v.nodes.length} — ${v.help} :: ${v.nodes
          .slice(0, 4)
          .map((n) => n.target.join(" ") + (n.any[0]?.data?.contrastRatio ? ` [${n.any[0].data.contrastRatio}:1 ${n.any[0].data.fgColor} on ${n.any[0].data.bgColor}]` : ""))
          .join(" | ")}`,
    );
}

test("every screen has no serious accessibility violations @smoke", async ({ page }) => {
  test.slow(); // fourteen pages scanned in one journey
  // Reduced motion: no auto-rotation or transitions, so every page scans in its settled state.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const post = async <T>(url: string, data: object) => (await (await page.request.post(url, { data })).json()) as T;

  // HSR covers the shared screens: the smoke journey adds Genshin through the library.
  const hsr = await post<{ id: string }>("/api/instances", { gameKey: "hsr" });
  const march = await post<{ id: string }>(`/api/instances/${hsr.id}/characters`, { catalogId: "1001" });
  // Genshin alone has the artifact inventory and planner and the full sheet; it is removed again below.
  const genshin = await post<{ id: string }>("/api/instances", { gameKey: "genshin" });

  const found: string[] = [];
  try {
    const pages = [
      "/",
      "/library",
      "/timeline",
      "/settings",
      "/admin",
      ...["", "/ownership", "/characters", "/gear", "/materials", "/planner", "/pulls", "/profile"].map((tab) => `/games/${hsr.id}${tab}`),
      `/characters/${march.id}`,
    ];
    for (const path of pages) {
      await page.goto(path);
      found.push(...(await violations(page, path)));
    }

    const amber = await post<{ id: string }>(`/api/instances/${genshin.id}/characters`, { catalogId: "10000021" });
    await page.goto(`/characters/${amber.id}`);
    found.push(...(await violations(page, "genshin sheet")));
    for (const view of ["Inventory", "Farm targets"]) {
      await page.goto(`/games/${genshin.id}/gear`);
      await page.getByRole("button", { name: view, exact: true }).click();
      found.push(...(await violations(page, `genshin gear ${view}`)));
    }
  } finally {
    await page.request.delete(`/api/instances/${genshin.id}`);
  }
  expect(found).toEqual([]);
});
