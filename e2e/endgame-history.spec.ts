import { expect, test } from "@playwright/test";

test("Endgame history per mode: tiles, chart, table, typing a past cycle and exporting CSV @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "zzz" } });
  const { id } = (await created.json()) as { id: string };
  await page.goto(`/games/${id}/endgame`);

  const history = page.getByRole("region", { name: "History", exact: true });
  await history.getByRole("group", { name: "Mode" }).getByRole("button", { name: "Deadly Assault" }).click();
  await history.getByRole("button", { name: "Add a past cycle" }).click();
  await history.getByLabel("A day in the cycle").fill("2026-09-27");
  await history.getByLabel("Stars", { exact: true }).fill("9");
  await history.getByLabel("Polychrome", { exact: true }).fill("300");
  await history.getByRole("button", { name: "Save" }).click();

  // Deadly Assault ran 25 Sep – 8 Oct 2026 (every 14 days since January); a full clear is 9 stars.
  // Not Genshin: the smoke journey adds Genshin through the library.
  const row = history.getByRole("row", { name: /25 Sept? – 8 Oct/ });
  await expect(row).toContainText("9");
  await expect(row).toContainText("300 / 300");
  await expect(history.getByText("Best")).toBeVisible();

  const download = page.waitForEvent("download");
  await history.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/deadly-assault.*\.csv$/i);
});

// Every cycle opens (Georges, round 5), on its card rather than in a window (round 6: "I'd rather have the highlighted card change").
test("Endgame: a past cycle becomes its card's, with its result, rewards, teams and version; older ones a step away; typed in place @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  // Shiyu Defense runs every 14 days from 2 Oct 2026: 18 Sep – 1 Oct, then 4 – 17 Sep.
  await page.request.put(`/api/instances/${id}/cycles`, { data: { modeKey: "shiyu", day: "2026-09-20", result: 4, premium: 600, detail: "e2e older", teams: [{ stage: "First half", members: [], time: 95 }] } });
  await page.request.put(`/api/instances/${id}/cycles`, { data: { modeKey: "shiyu", day: "2026-09-06", result: 5, premium: 780, detail: "e2e oldest" } });
  await page.goto(`/games/${id}/endgame`);

  // A bar of the card's last cycles makes it the card's cycle; no window opens.
  const card = page.getByRole("region", { name: "Shiyu Defense" });
  await card.getByRole("button", { name: /^Cycle of 18 Sept/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card.getByRole("button", { name: /^Cycle of 18 Sept/ })).toHaveAttribute("aria-pressed", "true");
  await expect(card).toContainText("18 Sept – 1 Oct");
  await expect(card).toContainText("version");
  await expect(card).toContainText("600 / 780");
  await expect(card).toContainText("e2e older");
  await expect(card).toContainText("1:35");

  // The older one a step away, typed in place.
  await card.getByRole("button", { name: "Older cycle" }).click();
  await expect(card).toContainText("4 Sept – 17 Sept");
  await expect(card).toContainText("e2e oldest");
  await card.getByRole("button", { name: "Update Shiyu Defense" }).click();
  await card.getByLabel("Detail").fill("e2e edited");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card).toContainText("e2e edited");
  const results = (await (await page.request.get(`/api/instances/${id}/cycles`)).json()) as { results: { modeKey: string; detail: string | null }[] };
  expect(results.results.filter((r) => r.modeKey === "shiyu").map((r) => r.detail)).toContain("e2e edited");

  // Back to now; a row of the History table makes its cycle the card's.
  await card.getByRole("button", { name: "Back to now" }).click();
  await expect(card).toContainText("Now");
  await page.getByRole("region", { name: "History", exact: true }).getByRole("button", { name: /18 Sept – 1 Oct/ }).click();
  await expect(card).toContainText("e2e older");
});
