import { expect, test } from "@playwright/test";

// Round 24 (Georges, 2026-10-29: "avoid small text as well"; he is visually impaired): no text on the screens stands under
// 13 px, apart from the drawn charts' own labels, which sit at pixel positions inside their drawings.
test("no text under 13 px on Home, the library, a game's tabs, Tasks, the banners and Settings @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const small: string[] = [];
  for (const path of ["/", "/library", `/games/${id}`, `/games/${id}/pulls`, `/games/${id}/characters`, `/games/${id}/endgame`, `/games/${id}/weapons`, `/games/${id}/gear`, "/tasks", "/timeline", "/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const found = await page.evaluate(() => {
      const skip = (el: Element) => el.closest("svg, .gp, .pl-curve, .heat-tip, .lb, .bars-labels, .legend, .cal-day, .pl-sim-note") !== null;
      const out: string[] = [];
      for (const el of document.querySelectorAll("body *")) {
        if (skip(el)) continue;
        const hasText = [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim().length > 0);
        if (!hasText) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < 13) out.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""} ${size}px "${el.textContent!.trim().slice(0, 30)}"`);
      }
      return [...new Set(out)].slice(0, 12);
    });
    for (const line of found) small.push(`${path}: ${line}`);
  }
  expect(small, small.join("\n")).toEqual([]);
});
