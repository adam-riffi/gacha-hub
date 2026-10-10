import { expect, test } from "@playwright/test";

test("Profile: account, passes with their reminders, game reminders, status @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library. Removed again at the end.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const reminder = async () => ((await (await page.request.get(`/api/instances/${id}/reminder`)).json()) as { config: Record<string, unknown> } | null)?.config;

  await page.goto(`/games/${id}/profile`);
  const tabs = page.getByRole("navigation", { name: "Game screens" });
  await expect(tabs.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
  await expect(tabs.getByRole("link", { name: "Overview" })).toHaveCount(0);

  // Account: the server's reset in server time, the UID masked once typed, the levels typed in place.
  const account = page.getByRole("region", { name: "Account" });
  await expect(account).toContainText("resets 04:00 server time");
  await account.getByRole("textbox", { name: "UID" }).fill("800123456");
  await account.getByRole("textbox", { name: "UID" }).blur();
  await expect(account).toContainText("8•••••••6");
  await account.getByRole("spinbutton", { name: "Trailblaze Level" }).fill("62");
  await account.getByRole("spinbutton", { name: "Trailblaze Level" }).blur();
  await account.getByRole("spinbutton", { name: "Equilibrium Level" }).fill("6");
  await account.getByRole("spinbutton", { name: "Equilibrium Level" }).blur();
  await expect(page.locator(".hub-chips")).toContainText("TL 62 · EQ 6");

  // Passes: days left typed after a purchase, each with its reminder.
  const passes = page.getByRole("region", { name: "Passes" });
  await passes.getByRole("button", { name: "Update Express Supply Pass" }).click();
  await passes.getByRole("spinbutton", { name: "Days left" }).fill("23");
  await passes.getByRole("button", { name: "Save" }).click();
  await expect(passes).toContainText("23 days left");
  await passes.getByRole("checkbox", { name: "Remind me 3 days before it ends" }).check();
  await expect.poll(async () => (await reminder())?.beforePassEnds).toBe(true);
  await expect(passes).toContainText("Lv 0 / 70");
  await passes.getByRole("checkbox", { name: /48 h before the end/ }).check();
  await expect.poll(async () => (await reminder())?.beforeBattlePassEnds).toBe(true);

  // Game reminders: this game's own switches.
  const reminders = page.getByRole("region", { name: "Game reminders" });
  await reminders.getByRole("checkbox", { name: "Trailblaze Power full" }).check();
  await expect.poll(async () => (await reminder())?.whenStaminaFull).toBe(true);
  await expect(reminders.getByRole("link", { name: /Global rules/ })).toHaveAttribute("href", "/tasks");

  // Status: export this game, sleep it, remove it.
  const status = page.getByRole("region", { name: "Game status" });
  const download = page.waitForEvent("download");
  await status.getByRole("button", { name: "Export JSON" }).click();
  expect((await download).suggestedFilename()).toMatch(/^gacha-hub-hsr-\d{4}-\d{2}-\d{2}\.json$/);
  await status.getByRole("button", { name: "Sleep this game" }).click();
  await expect(status.getByRole("button", { name: "Wake this game" })).toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await status.getByRole("button", { name: "Remove…" }).click();
  await expect(page).toHaveURL(/\/library$/);
});
