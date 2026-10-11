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

// Every cycle opens (Georges, round 5: "click on something and get the data from that version on endgame,
// or open a small version history to see where I was at x endgame version").
test("Endgame: a cycle opens with its result, rewards, teams and version; older cycles a step away; typed in place @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "zzz" } })).json()) as { id: string };
  // Shiyu Defense runs every 14 days from 2 Oct 2026: 18 Sep – 1 Oct, then 4 – 17 Sep.
  await page.request.put(`/api/instances/${id}/cycles`, { data: { modeKey: "shiyu", day: "2026-09-20", result: 4, premium: 600, detail: "e2e older", teams: [{ stage: "First half", members: [], time: 95 }] } });
  await page.request.put(`/api/instances/${id}/cycles`, { data: { modeKey: "shiyu", day: "2026-09-06", result: 5, premium: 780, detail: "e2e oldest" } });
  await page.goto(`/games/${id}/endgame`);

  // A bar of the card's last cycles opens that cycle.
  const card = page.getByRole("region", { name: "Shiyu Defense" });
  await card.getByRole("button", { name: /^Cycle of 18 Sept/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName(/Shiyu Defense · 18 Sept – 1 Oct/);
  await expect(dialog).toContainText("version");
  await expect(dialog).toContainText("600 / 780");
  await expect(dialog).toContainText("e2e older");
  await expect(dialog).toContainText("1:35");

  // The older one a step away; every cycle listed to jump to, the current one marked.
  await dialog.getByRole("button", { name: "Older cycle" }).click();
  await expect(dialog).toHaveAccessibleName(/4 Sept – 17 Sept/);
  await expect(dialog).toContainText("e2e oldest");
  const cycles = dialog.getByRole("list", { name: "Cycles" });
  await expect(cycles.getByRole("button", { name: /4 Sept – 17 Sept/ })).toHaveAttribute("aria-current", "true");

  // Typed in place.
  await dialog.getByRole("button", { name: "Edit" }).click();
  await dialog.getByLabel("Detail").fill("e2e edited");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toContainText("e2e edited");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  // The card's History opens the current cycle; a row of the History table opens its own.
  await card.getByRole("button", { name: "Shiyu Defense history" }).click();
  await expect(page.getByRole("dialog")).toContainText("Now");
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await page.getByRole("region", { name: "History", exact: true }).getByRole("button", { name: /18 Sept – 1 Oct/ }).click();
  await expect(page.getByRole("dialog")).toContainText("e2e older");
});
