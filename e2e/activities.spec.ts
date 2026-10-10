import { expect, test } from "@playwright/test";

test("a game's Activities tab: stamina, the daily, weekly and monthly lists, cycles and version @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "zzz" } });
  const { id } = (await created.json()) as { id: string };

  // Activities is the hub's first tab and its landing screen; Profile is last.
  await page.goto(`/games/${id}`);
  const tabs = page.getByRole("navigation", { name: "Game screens" }).getByRole("link");
  await expect(tabs.first()).toHaveText(/activities/i);
  await expect(tabs.first()).toHaveAttribute("aria-current", "page");
  await expect(tabs.last()).toHaveText(/profile/i);

  // Stamina with its reserve.
  const stamina = page.getByRole("region", { name: "Battery Charge" });
  await expect(stamina).toContainText("/ 240");
  await expect(stamina).toContainText(/backup battery charge/i);
  const full = stamina.getByRole("checkbox", { name: "Remind me when full" });
  await full.check();
  await expect(full).toBeChecked();

  // The daily list: ticking an item counts it.
  const daily = page.getByRole("region", { name: "Daily" });
  await expect(daily).toContainText(/resets in/i);
  await daily.getByRole("checkbox", { name: "Daily Missions" }).check();
  await expect(daily.getByRole("heading")).toContainText("1 / 2");

  // A monthly item follows its shop's reset.
  const monthly = page.getByRole("region", { name: "Monthly" });
  await monthly.getByRole("button", { name: "Add a monthly" }).click();
  await monthly.getByLabel("Title").fill("Signal Shop tapes");
  await monthly.getByLabel("Resets with").selectOption({ label: "Signal Shop · 1st" });
  await monthly.getByRole("button", { name: "Add" }).click();
  await expect(monthly.getByRole("checkbox", { name: "Signal Shop tapes" })).toBeVisible();

  // Each endgame mode with its reset, and the version.
  const cycles = page.getByRole("region", { name: "Cycles" });
  for (const mode of ["Shiyu Defense", "Deadly Assault"]) await expect(cycles).toContainText(mode);
  const version = page.getByRole("region", { name: /Version 3\.2/ });
  await expect(version).toContainText(/ends/i);

  // The battle pass and the 30-day pass, typed in place.
  await version.getByRole("button", { name: "Update the battle pass" }).click();
  await version.getByLabel("Level").fill("20");
  await version.getByLabel("Weekly XP").fill("4000");
  await version.getByRole("button", { name: "Save" }).click();
  await expect(version).toContainText("20 / 50");
  await expect(version).toContainText(/levels? a day/i);
  await monthly.getByRole("button", { name: "Update Inter-Knot Membership" }).click();
  await monthly.getByLabel("Days left").fill("23");
  await monthly.getByRole("button", { name: "Save" }).click();
  await expect(monthly).toContainText("23 days left");
});

test("the hub carries no leftover labels: no Manual tags, no By cadence @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const build = (await (await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1005" } })).json()) as { id: string };

  // Georges, 2026-10-10: "useless artifacts left from your thinking, like those Manual cards or the By cadence".
  for (const path of [`/games/${id}`, `/games/${id}/endgame`, `/games/${id}/gear`, `/games/${id}/profile`, `/characters/${build.id}`]) {
    await page.goto(path);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator(".tag", { hasText: /^Manual$/ })).toHaveCount(0);
    await expect(page.getByText("By cadence", { exact: true })).toHaveCount(0);
  }
});
