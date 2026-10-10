import { expect, test } from "@playwright/test";

/**
 * Every text adds to the data (Georges, 2026-10-11: "not a shareholder report"):
 * the sentences the audit cut (docs/AUDIT-2026-10-11.md) stay gone, and no
 * source label sits on what the user typed.
 */
const GONE = [
  "Simulate a top-up",
  "what buying more would give",
  "(standard)",
  "pity and status from your log",
  "not counted",
  "so your next",
  "logged on this banner yet",
  "By soft pity",
  "chance of the featured",
  "no banner of this kind running",
  "Point at a cycle",
  "built characters first",
  "Own it to start a build",
  "parties of",
  "not on record yet",
  "Typed in, or filled",
  "does not expose pass days",
  "These switches are",
  "Sleep hides the game",
  "goes to Tasks with",
  "Character copies raise",
  "off by default",
  "Items are upserted",
  "typed in here",
  "from Plan farming",
  "An asleep game",
  "never checks in",
];

test("the screens carry no report sentences and no source labels on your own records @smoke", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // A cycle typed in, so the Endgame history has a row whose source used to show.
  const lastWeek = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  expect((await page.request.put(`/api/instances/${id}/cycles`, { data: { modeKey: "moc", day: lastWeek, result: 30 } })).ok()).toBe(true);
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005" } })).json()) as { id: string };

  for (const path of ["/tasks", "/timeline", "/settings", "/admin", `/games/${id}`, `/games/${id}/endgame`, `/games/${id}/pulls`, `/games/${id}/characters`, `/games/${id}/teams`, `/games/${id}/gear`, `/games/${id}/profile`, `/games/${id}/units/1004`, `/characters/${build.id}`]) {
    await page.goto(path);
    await expect(page.getByRole("heading").first()).toBeVisible();
    const text = await page.locator("main").innerText();
    for (const phrase of GONE) expect(text, `${path}: "${phrase}"`).not.toContain(phrase);
    await expect(page.locator(".tag", { hasText: /^(manual|admin|feed)$/i })).toHaveCount(0);
  }
});
