import { expect, test } from "@playwright/test";

test("a game's Activities tab: stamina, the daily, weekly and monthly lists, cycles, the battle pass and the version @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const created = await page.request.post("/api/instances", { data: { gameKey: "zzz" } });
  const { id } = (await created.json()) as { id: string };

  // The hub opens on Activities again (Georges, round 4: its dashboard is Home's); Profile is last.
  await page.goto(`/games/${id}`);
  const tabs = page.getByRole("navigation", { name: "Game screens" }).getByRole("link");
  await expect(tabs.first()).toHaveText(/activities/i);
  await expect(tabs.first()).toHaveAttribute("aria-current", "page");
  await expect(tabs.last()).toHaveText(/profile/i);

  // Stamina with its reserve.
  const stamina = page.getByRole("region", { name: "Battery Charge" });
  await expect(stamina).toContainText("/ 240");
  await expect(stamina).toContainText(/backup battery charge/i);
  // Its reminder lives in Settings → Notifications (round 27, Georges: "reminders are settings not features").
  await expect(stamina.getByRole("checkbox")).toHaveCount(0);

  // The daily list: ticking an item counts it.
  const daily = page.getByRole("region", { name: "Daily" });
  await expect(daily).toContainText(/resets in/i);
  // A counted daily by its steps here too (round 7): the last step completes it.
  await daily.getByRole("group", { name: "Daily Missions" }).getByRole("button", { name: "4 of 4" }).click();
  // ZZZ's four dailies: Daily Missions, Scratch Card, and the design's Coffee and Video store.
  // Round 17 added Star Rail's Trailblaze Power and Nameless Honor dailies: five a day.
  await expect(daily.getByRole("heading")).toContainText("1 / 5");

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
  // The battle pass is a card of its own beside the version's (round 26, Georges: "the version cards are too big, split
  // them up … don't put BP and version in the same thing"): neither holds the other.
  const pass = page.getByRole("region", { name: "Battle pass" });
  await expect(pass).toHaveClass(/card/);
  await expect(version).toHaveClass(/card/);
  await expect(version.getByRole("region", { name: "Battle pass" })).toHaveCount(0);
  await expect(pass).not.toContainText(/Version 3\.2/);
  await expect(version).not.toContainText(/battle pass/i);
  // Round 27 (Georges: "cards that are too big and empty"): the cycles and pass cards share the row; the version card
  // stands alone under them, as wide as the row, its events in two columns.
  const row = (await page.locator(".act-bottom").boundingBox())!;
  const versionBox = (await version.boundingBox())!;
  expect(versionBox.y, "the version card under the row").toBeGreaterThanOrEqual(row.y + row.height - 1);
  expect(versionBox.width, "as wide as the row").toBeGreaterThanOrEqual(row.width - 2);
  await expect(page.locator(".act-bottom > .card")).toHaveCount(2);

  // The battle pass and the 30-day pass, typed in place.
  await pass.getByRole("button", { name: "Update the battle pass" }).click();
  await pass.getByLabel("Level").fill("20");
  await pass.getByLabel("Weekly XP").fill("4000");
  await pass.getByRole("button", { name: "Save" }).click();
  await expect(pass).toContainText("20 / 50");
  await expect(pass).toContainText(/levels? a day/i);
  await monthly.getByRole("button", { name: "Update Inter-Knot Membership" }).click();
  await monthly.getByLabel("Days left").fill("23");
  await monthly.getByRole("button", { name: "Save" }).click();
  await expect(monthly).toContainText("23 days left");
});

test("the hub carries no leftover labels: no Manual tags, no By cadence @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
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

// Georges, round 11: "the philosophy for this whole project is so that I don't need to go around X websites to check my data".
test("Activities: the game's redeem codes, each with its rewards, Copy and the official page; ticked redeemed, it moves below @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // The codes as the server gives them, without asking the outside source from the journey.
  let redeemed = false;
  await page.route(`**/api/instances/${id}/codes`, (route) =>
    route.fulfill({
      json: {
        available: true,
        codes: [
          { code: "STARRAILGIFT", rewards: "50 stellar jade", redeemed, redeemUrl: "https://hsr.hoyoverse.com/gift?code=STARRAILGIFT" },
          { code: "E2ENEWCODE", rewards: "Stellar Jade ×60", redeemed: false, redeemUrl: "https://hsr.hoyoverse.com/gift?code=E2ENEWCODE" },
        ],
      },
    }),
  );
  await page.route(`**/api/instances/${id}/codes/STARRAILGIFT`, async (route) => {
    redeemed = Boolean((route.request().postDataJSON() as { redeemed: boolean }).redeemed);
    await route.fulfill({ json: { code: "STARRAILGIFT", redeemed } });
  });
  await page.goto(`/games/${id}`);
  const card = page.getByRole("region", { name: "Codes" });
  await expect(card).toContainText("2 to redeem");
  const gift = card.getByRole("group", { name: "STARRAILGIFT" });
  await expect(gift).toContainText("50 stellar jade");
  await expect(gift.getByRole("button", { name: "Copy" })).toBeVisible();
  await expect(gift.getByRole("link", { name: /Redeem/ })).toHaveAttribute("href", "https://hsr.hoyoverse.com/gift?code=STARRAILGIFT");
  // Ticked, it leaves the list for Redeemed below (so click, then look for it there).
  await gift.getByRole("checkbox", { name: "Redeemed" }).click();
  await expect(card).toContainText("1 to redeem");
  await expect(card.getByText("Redeemed 1")).toBeVisible();
});
