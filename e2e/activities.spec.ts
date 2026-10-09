import { expect, test } from "@playwright/test";

test("a game's Activities tab: stamina, the daily, weekly and monthly lists, cycles and version @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "zzz" } });
  const { id } = (await created.json()) as { id: string };

  // Activities is the hub's first tab and its landing screen; the old overview is last.
  await page.goto(`/games/${id}`);
  const tabs = page.getByRole("navigation", { name: "Game screens" }).getByRole("link");
  await expect(tabs.first()).toHaveText(/activities/i);
  await expect(tabs.first()).toHaveAttribute("aria-current", "page");
  await expect(tabs.last()).toHaveText(/overview/i);

  // Stamina with its reserve.
  const stamina = page.getByRole("region", { name: "Battery Charge" });
  await expect(stamina).toContainText("/ 240");
  await expect(stamina).toContainText(/backup battery charge/i);

  // The daily list: ticking an item counts it.
  const daily = page.getByRole("region", { name: "Daily" });
  await expect(daily).toContainText(/resets in/i);
  await daily.getByRole("checkbox", { name: "Daily Missions" }).check();
  await expect(daily.getByRole("heading")).toContainText("1 / 2");

  // A monthly item follows its shop's reset.
  const monthly = page.getByRole("region", { name: "Monthly" });
  await monthly.getByRole("button", { name: "Add a monthly" }).click();
  await monthly.getByLabel("Title").fill("Signal Store tapes");
  await monthly.getByLabel("Resets with").selectOption({ label: "Signal Store · 1st" });
  await monthly.getByRole("button", { name: "Add" }).click();
  await expect(monthly.getByRole("checkbox", { name: "Signal Store tapes" })).toBeVisible();

  // Each endgame mode with its reset, and the version.
  const cycles = page.getByRole("region", { name: "Cycles" });
  for (const mode of ["Shiyu Defense", "Deadly Assault"]) await expect(cycles).toContainText(mode);
  await expect(page.getByRole("region", { name: /Version 3\.2/ })).toContainText(/ends/i);
});
