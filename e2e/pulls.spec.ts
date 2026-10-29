import { expect, test } from "@playwright/test";
import { blockOutsideArt } from "./outside-art";

test("Pulls: what you have and what is coming, an event banner's status, pity and odds, logging a 5★ @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
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
  const curve = banner.getByRole("img", { name: /chance of the featured 5★/ });
  await expect(curve).toBeVisible();
  const shape = await curve.locator(".pl-line").getAttribute("d");

  // The curve keeps its whole shape as pity grows; the markers move along it.
  await banner.getByRole("button", { name: "+10" }).click();
  await expect(banner.getByTestId("pity")).toHaveText("10");
  await expect(curve.locator(".pl-line")).toHaveAttribute("d", shape!);
  await expect(curve).toHaveAttribute("aria-label", /you are at pity 10/);
  await expect(banner.locator(".pl-legend")).toContainText("30 pulls");

  // A top-up simulation, shown as a plus sign (Georges, 2026-10-11: "remove top-up and change it to a plus sign").
  await page.getByLabel("Amount to add").fill("1600");
  await expect(page.getByRole("region", { name: "Pulls available" })).toContainText("+10 pulls");
  await expect(banner.locator(".pl-legend")).toContainText("+10 ·");
  // The simulator is a plus sign; round 6's "Top-up to 100%" card is its own.
  await expect(page.getByRole("region", { name: "Pulls available" })).not.toContainText(/top-up/i);
  await page.getByLabel("Amount to add").fill("");

  // Standard banners get the full card too.
  await expect(page.getByRole("region", { name: "Stellar warp" }).getByRole("img", { name: /chance of a 5★/ })).toBeVisible();

  await banner.getByRole("button", { name: "Log a 5★" }).click();
  await banner.getByLabel("5★ at pull").fill("7");
  await banner.getByLabel("Featured", { exact: true }).uncheck();
  await banner.getByRole("button", { name: "Save 5★" }).click();
  await expect(banner.getByTestId("pity")).toHaveText("3");
  await expect(banner.getByRole("button", { name: "Guaranteed" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "History", exact: true })).toContainText("17");

  // Every banner type shows; one you do not use hides, and comes back from the hidden strip.
  await page.getByRole("region", { name: "Stellar warp" }).getByRole("button", { name: "Hide" }).click();
  await expect(page.getByRole("region", { name: "Stellar warp" })).toHaveCount(0);
  await page.getByRole("button", { name: "Show Stellar warp" }).click();
  await expect(page.getByRole("region", { name: "Stellar warp" })).toBeVisible();

  // Home shows the pity next to the game's pulls.
  await page.goto("/");
  await expect(page.locator(".pull-row-pity", { hasText: "Character 3/90" })).toContainText("guaranteed");
});

test("Pulls: the savings planner plans each event banner's featured 5★ in order, worst case or on average @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
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
  await page.getByRole("button", { name: "Continue" }).click();
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
  await page.getByRole("button", { name: "Continue" }).click();
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
    await expect(chartered).toContainText("With 10");
    await expect(page.getByRole("region", { name: "Arsenal" })).toContainText("With 20");
  } finally {
    await page.request.delete(`/api/instances/${id}`);
  }
});

test("Pulls: a running banner's featured character opens its page @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const upload = await page.request.post("/api/admin/payload", {
    data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-nav", name: "E2E nav warp", kind: "character", startsAt: iso(-1), endsAt: iso(20), featured: [{ catalogId: "1005", kind: "character" }] }] },
  });
  expect(upload.ok()).toBe(true);
  await page.goto(`/games/${id}/pulls`);
  await page.getByRole("region", { name: "Character event warp" }).getByRole("link", { name: "Kafka" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/units/1005$`));
  await page.request.delete("/api/admin/banners/hsr/e2e-nav");
});

test("Pulls: a logged 5★ is corrected from History, and Banner history shows your pulls on each banner with its characters @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  await page.request.post("/api/admin/payload", {
    data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-history", name: "E2E history warp", kind: "character", startsAt: iso(-2), endsAt: iso(12), featured: [{ catalogId: "1005", kind: "character" }] }] },
  });
  await page.request.post(`/api/instances/${id}/pulls/calibrate`, { data: { bannerKey: "character", pity: 0, guaranteed: false } });
  await page.request.post(`/api/instances/${id}/pulls`, { data: { bannerKey: "character", count: 10, fiveStarAt: 10, featured: true, catalogId: "1005" } });

  await page.goto(`/games/${id}/pulls`);
  // Logged at the tenth pull, it was the seventh: corrected in place.
  const history = page.getByRole("region", { name: "History", exact: true });
  const row = history.getByRole("row").filter({ hasText: "Kafka" }).first();
  await row.getByRole("button", { name: "Edit" }).click();
  const editing = history.locator("tr.pl-edit");
  await editing.getByRole("spinbutton", { name: "Pity" }).fill("7");
  await editing.getByRole("button", { name: "Save" }).click();
  await expect(history.getByRole("row").filter({ hasText: "Kafka" }).first()).toContainText("7");
  await expect(page.getByRole("region", { name: "Character event warp" }).getByTestId("pity")).toHaveText("3");

  // Banner history: each banner with your pulls on it; its characters open their pages.
  const past = page.getByRole("region", { name: "Banner history" });
  const warp = past.getByRole("row").filter({ hasText: "E2E history warp" });
  await expect(warp.locator(".bh-pulls")).toHaveText(/^\d+$/);
  await warp.getByRole("link", { name: "Kafka" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/units/1005$`));
  await page.request.delete("/api/admin/banners/hsr/e2e-history");
});

// By the end of the version, filled (Georges, round 5: "fill it up by data like X% chance to get X limited … use icons").
test("Pulls: by the end of the version, each target by its icon with its chance now and by then @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.put(`/api/instances/${id}/wishlist`, { data: { kind: "character", catalogId: "1102", wished: true } });

  await page.goto(`/games/${id}/pulls`);
  const end = page.getByRole("region", { name: /^By the end of/ });
  const seele = end.getByRole("list", { name: "Chances" }).getByRole("listitem").filter({ hasText: "Seele" });
  await expect(seele.getByRole("img", { name: "Seele" })).toBeVisible();
  const [now, then] = (await seele.locator(".pl-chances-v .font-mono").allTextContents()).map((t) => Number(t.replace(/\D/g, "")));
  expect(then).toBeGreaterThanOrEqual(now!);
  // The running banners' featured units come first, each by its icon.
  await expect(end.getByRole("list", { name: "Chances" }).getByRole("listitem").first().getByRole("img")).toBeVisible();
});

// One grid whose rows line up, whatever is hidden; no beginner banner; a banner without art by its kind's icon (Georges, round 6).
test("Pulls: one grid of banners whose rows line up, their odds tables whole, no beginner banner @smoke", async ({ page }) => {
  // Round 22: the slots' sources stand in while the store is empty; refused here, so the marks below are the drawn ones.
  await blockOutsideArt(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto(`/games/${id}/pulls`);
  const cards = page.locator(".pl-banners > .pl-banner");
  await expect(cards.nth(1)).toBeVisible();
  await expect(page.getByRole("region", { name: "Departure warp" })).toHaveCount(0);
  await expect(page.getByText(/Departure/)).toHaveCount(0);
  await expect(page.locator(".pl-banners")).toHaveCount(1);
  const [a, b] = [(await cards.nth(0).boundingBox())!, (await cards.nth(1).boundingBox())!];
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(Math.abs(a.height - b.height)).toBeLessThan(2);
  // Round 24: the odds are three tiles of one size (odds.spec.ts), no table.
  await expect(cards.first().getByRole("group", { name: "Odds" }).locator(".odds-tile")).toHaveCount(3);
  // A banner without a featured unit shows its kind as an icon, not letters.
  await expect(page.getByRole("region", { name: "Stellar warp" }).locator(".pl-banner-head svg.glyph")).toBeVisible();
});

// Georges, round 6: "a top-up suggestion … a % of chance of getting the character by the end of the banner, and how many top-ups
// of what kind at the lowest price would get the chances to 100%".
test("Pulls: each running banner's chance by its end, and the cheapest top-up to a sure featured 5★ @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  // A banner running for ten more days, in case no other journey's runs (the first running one of a kind is shown).
  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  expect((await page.request.post("/api/admin/payload", { data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-topup", name: "E2E top-up warp", kind: "character", startsAt: iso(-1), endsAt: iso(10), featured: [{ catalogId: "1005", kind: "character" }] }] } })).ok()).toBe(true);
  try {
    await page.goto(`/games/${id}/pulls`);
    const row = page.getByRole("region", { name: "Top-up to 100%" }).getByRole("listitem").first();
    await expect(row.getByRole("img").first()).toBeVisible();
    await expect(row).toContainText(/by \d+ \w+ · (>?\d+)%/);
    await expect(row).toContainText(/\$\d+\.\d\d|Covered/);
  } finally {
    await page.request.delete("/api/admin/banners/hsr/e2e-topup");
  }
});

// Georges, round 7: "add a top up history system too".
// Star Rail, not Genshin: the smoke journey adds Genshin through the library.
test("Pulls: a top-up logged in one click, the month's, year's and all spending; the pass adds its days @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  for (const t of (await (await page.request.get(`/api/instances/${id}/topups`)).json()) as { id: string }[]) await page.request.delete(`/api/instances/${id}/topups/${t.id}`);
  await page.request.put(`/api/instances/${id}/passes/monthly`, { data: { daysLeft: 0 } });

  await page.goto(`/games/${id}/pulls`);
  const card = page.getByRole("region", { name: "Top-ups" });
  await card.getByRole("button", { name: "Log 980 + 110 for $14.99" }).click();
  const history = card.getByRole("list", { name: "Top-up history" });
  await expect(history.getByRole("listitem")).toHaveCount(1);
  await card.getByRole("button", { name: "Log Express Supply Pass for $4.99" }).click();
  await expect(history.getByRole("listitem")).toHaveCount(2);
  await expect(card.getByRole("group", { name: "This month" })).toContainText("$19.98");
  await expect(card.getByRole("group", { name: "This month" })).toContainText("1,390");
  // The pass bought adds its 30 days.
  const daysLeft = async () => {
    const { monthly } = (await (await page.request.get(`/api/instances/${id}/passes`)).json()) as { monthly: { endsAt: string } | null };
    return monthly ? Math.ceil((Date.parse(monthly.endsAt) - Date.now()) / 86_400_000) : 0;
  };
  await expect.poll(daysLeft).toBe(30);

  await history.getByRole("listitem").filter({ hasText: "980 + 110" }).getByRole("button", { name: "Delete" }).click();
  await expect(history.getByRole("listitem")).toHaveCount(1);
  await expect(card.getByRole("group", { name: "All time" })).toContainText("$4.99");
});

// Georges, round 8: "top up takes too much space: it should be at the very bottom, more visual, with a direct conversion of pack to pulls".
test("Pulls: the top-ups at the very bottom, each pack and the pass in pulls @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.goto(`/games/${id}/pulls`);
  const card = page.getByRole("region", { name: "Top-ups" });
  // 980 + 110 Oneiric Shards: 1,090 Stellar Jade, 6 warps at 160; 6,480 + 1,600: 50; the pass: 300 now and 90 a day for 30 days, 18.
  await expect(card.getByRole("button", { name: "Log 980 + 110 for $14.99" })).toContainText("6 pulls");
  await expect(card.getByRole("button", { name: "Log 6480 + 1600 for $99.99" })).toContainText("50 pulls");
  await expect(card.getByRole("button", { name: "Log Express Supply Pass for $4.99" })).toContainText("18 pulls");
  // Below everything else on the page.
  const bottom = (await card.boundingBox())!.y;
  expect((await page.getByRole("region", { name: "Pulls available" }).boundingBox())!.y).toBeLessThan(bottom);
  // The savings planner and the pull history sit above it too.
  expect((await page.locator(".pl-bottom").boundingBox())!.y).toBeLessThan(bottom);
});
