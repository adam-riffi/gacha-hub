import { expect, test } from "@playwright/test";

test("Pulls: what you have and what is coming, an event banner's status, pity and odds, logging a 5★ @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library, and
  // journeys share one database. The install call is idempotent.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/currencies/stellarJade`, { data: { value: 3200 } });
  await page.request.put(`/api/instances/${id}/currencies/specialPass`, { data: { value: 10 } });

  await page.goto(`/games/${id}/pulls`);
  await expect(page.getByRole("region", { name: "Pulls available" })).toContainText("30");
  await expect(page.getByRole("region", { name: /^By the end of/ })).toContainText("Daily Training");

  const banner = page.getByRole("region", { name: "Character event warp" });
  await expect(banner.getByTestId("pity")).toHaveText("0");
  await expect(banner.getByRole("button", { name: "50/50" })).toHaveAttribute("aria-pressed", "true");
  await expect(banner).toContainText("Next pull");
  await expect(banner.getByRole("img", { name: /chance of the featured 5★/ })).toBeVisible();

  await banner.getByRole("button", { name: "+10" }).click();
  await expect(banner.getByTestId("pity")).toHaveText("10");

  await banner.getByRole("button", { name: "Log a 5★" }).click();
  await banner.getByLabel("5★ at pull").fill("7");
  await banner.getByLabel("Featured", { exact: true }).uncheck();
  await banner.getByRole("button", { name: "Save 5★" }).click();
  await expect(banner.getByTestId("pity")).toHaveText("3");
  await expect(banner.getByRole("button", { name: "Guaranteed" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "History" })).toContainText("17");

  // Home shows the pity next to the game's pulls.
  await page.goto("/");
  await expect(page.locator(".pull-row-pity", { hasText: "Character 3/90" })).toContainText("guaranteed");
});

test("Pulls: the savings planner plans each event banner's featured 5★ in order, worst case or on average @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };

  await page.goto(`/games/${id}/pulls`);
  const planner = page.getByRole("region", { name: "Savings planner" });
  const rows = planner.locator(".pl-target");
  // The running banners come first; wishlisted units other journeys left may follow.
  await expect(rows.nth(1)).toBeVisible();
  await expect(rows.first()).toContainText("needs ≤");
  const worst = await rows.first().locator(".pl-needs").textContent();
  await planner.getByRole("radio", { name: "Average" }).check();
  await expect(rows.first().locator(".pl-needs")).not.toHaveText(worst!);
});

test("Pulls: the savings planner adds your wishlisted 5★ after the running banners @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/wishlist`, { data: { kind: "character", catalogId: "1102", wished: true } });

  await page.goto(`/games/${id}/pulls`);
  const seele = page.getByRole("region", { name: "Savings planner" }).locator(".pl-target", { hasText: "Seele" });
  await expect(seele).toContainText("Wishlist");
  await expect(seele).toContainText("needs ≤");
});

test("Pulls for Endfield: a 6★ is the top pull, and the Arsenal spends Arsenal Tickets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "endfield" } })).json()) as { id: string };
  try {
    // 5,000 Oroberyl is 10 headhunts; 3,960 Arsenal Tickets are two 10-pulls on the Arsenal only.
    await page.request.put(`/api/instances/${id}/currencies/oroberyl`, { data: { value: 5000 } });
    await page.request.put(`/api/instances/${id}/currencies/arsenal`, { data: { value: 3960 } });
    await page.goto(`/games/${id}/pulls`);
    await expect(page.getByRole("region", { name: "Pulls available" })).toContainText("10 limited · +20 Arsenal");
    const chartered = page.getByRole("region", { name: "Chartered headhunting" });
    await expect(chartered).toContainText("6★ pity");
    await expect(chartered.getByRole("button", { name: "Log a 6★" })).toBeVisible();
    await expect(chartered).toContainText("Featured by your 10 pulls");
    await expect(page.getByRole("region", { name: "Arsenal" })).toContainText("Featured by your 20 pulls");
  } finally {
    await page.request.delete(`/api/instances/${id}`);
  }
});
