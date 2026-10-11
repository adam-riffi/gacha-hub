import { expect, test } from "@playwright/test";

const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

test("paging the calendar back shows what already ended @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  await page.request.post("/api/instances", { data: { gameKey: "hsr" } });
  const upload = await page.request.post("/api/admin/payload", {
    data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-ended", name: "E2E ended warp", kind: "character", startsAt: iso(-20), endsAt: iso(-10) }] },
  });
  expect(upload.ok()).toBe(true);

  await page.goto("/timeline");
  await expect(page.getByRole("heading", { name: "Banners and events" })).toBeVisible();
  await expect(page.locator(".cal-name", { hasText: "E2E ended warp" })).toHaveCount(0); // the window starts this Monday

  await page.getByRole("button", { name: "‹ 2 weeks" }).click();
  await expect(page.locator(".cal-name", { hasText: "E2E ended warp" })).toBeVisible();
});

test("a reward event carries its roster tag; its pick and Make goal set the goal; layers add rows @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.post(`/api/instances/${id}/characters`, { data: { catalogId: "1009", doc: { eidolon: 2 } } });
  const upload = await page.request.post("/api/admin/payload", {
    data: {
      kind: "events",
      gameKey: "hsr",
      items: [
        {
          key: "e2e-reward",
          name: "E2E free 4-star",
          startsAt: iso(-1),
          endsAt: iso(6),
          effects: [
            { kind: "choose", options: [{ label: "Asta", effects: [{ kind: "unit.copy", unit: "character", catalogId: "1009", count: 1 }] }, { label: "Serval", effects: [{ kind: "unit.copy", unit: "character", catalogId: "1103", count: 1 }] }] },
            { kind: "currency.add", currency: "stellarJade", amount: 800 },
          ],
        },
      ],
    },
  });
  expect(upload.ok()).toBe(true);

  await page.goto("/timeline?game=hsr");
  const bar = page.getByRole("region", { name: "Timeline" }).getByRole("button", { name: /E2E free 4-star/ });
  await expect(bar).toContainText("+1 E");
  await bar.click();
  const selected = page.getByRole("complementary", { name: "Selected" });
  await expect(selected.getByRole("heading", { name: "E2E free 4-star" })).toBeVisible();
  await expect(selected.getByText("E2 → E3")).toBeVisible();
  await expect(selected.getByText(/Also in this event: 800 Stellar Jade/)).toBeVisible();
  await selected.getByRole("radio", { name: /Asta/ }).check();
  await selected.getByRole("button", { name: "Make goal" }).click();
  const rewards = page.getByRole("region", { name: "Rewards that update your roster" });
  await expect(rewards.getByText("Goal set")).toBeVisible();

  const cycles = page.getByRole("checkbox", { name: "Endgame cycles" });
  await expect(cycles).not.toBeChecked();
  await expect(page.locator(".cal-lane-name", { hasText: "Endgame" })).toHaveCount(0);
  await cycles.check();
  await expect(page.locator(".cal-lane-name", { hasText: "Endgame" })).toBeVisible();

  await page.getByRole("group", { name: "View" }).getByRole("button", { name: "List" }).click();
  await expect(page.getByRole("cell", { name: "E2E free 4-star" })).toBeVisible();
});

test("Only what I wishlisted keeps the banners and events of the units you wish for @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const upload = await page.request.post("/api/admin/payload", {
    data: {
      kind: "banners",
      gameKey: "hsr",
      items: [
        { key: "e2e-wished", name: "E2E wished warp", kind: "character", startsAt: iso(-1), endsAt: iso(12), featured: [{ catalogId: "1102", kind: "character", rateUp: true }] },
        { key: "e2e-unwished", name: "E2E unwished warp", kind: "character", startsAt: iso(-2), endsAt: iso(11), featured: [{ catalogId: "1006", kind: "character", rateUp: true }] },
      ],
    },
  });
  expect(upload.ok()).toBe(true);
  await page.request.put(`/api/instances/${id}/wishlist`, { data: { kind: "character", catalogId: "1102", wished: true } });
  await page.request.put(`/api/instances/${id}/wishlist`, { data: { kind: "character", catalogId: "1006", wished: false } });

  await page.goto("/timeline?game=hsr");
  const timeline = page.getByRole("region", { name: "Timeline" });
  await expect(timeline.getByRole("button", { name: /E2E unwished warp/ })).toBeVisible();
  await page.getByRole("checkbox", { name: "Only what I wishlisted" }).check();
  await expect(timeline.getByRole("button", { name: /E2E wished warp/ })).toBeVisible();
  await expect(timeline.getByRole("button", { name: /E2E unwished warp/ })).toHaveCount(0);
});

test("Banners: a tick for every day and each bar's dates, a month view of what starts and ends each day, and a featured unit opens its page @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const upload = await page.request.post("/api/admin/payload", {
    data: { kind: "banners", gameKey: "hsr", items: [{ key: "e2e-month", name: "E2E month warp", kind: "character", startsAt: iso(1), endsAt: iso(3), featured: [{ catalogId: "1005", kind: "character" }] }] },
  });
  expect(upload.ok()).toBe(true);

  // The timeline marks every day of its six weeks, and each bar says when it starts and ends (Georges, 2026-10-10).
  await page.goto("/timeline?game=hsr");
  const timeline = page.getByRole("region", { name: "Timeline" });
  await expect(timeline.locator(".cal-day")).toHaveCount(42);
  await expect(timeline.getByRole("button", { name: /E2E month warp/ })).toContainText("→");

  // The month view lists what starts and what ends on each day.
  await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Month" }).click();
  const month = page.getByRole("region", { name: "Month" });
  await expect(month.getByRole("button", { name: "Starts: E2E month warp" })).toBeVisible();
  await expect(month.getByRole("button", { name: "Ends: E2E month warp" })).toBeVisible();

  // A banner's featured character opens its page: from the banners to the character in one click.
  await month.getByRole("button", { name: "Starts: E2E month warp" }).click();
  await page.getByRole("complementary", { name: "Selected" }).getByRole("link", { name: "Kafka" }).click();
  await expect(page).toHaveURL(new RegExp(`/games/${id}/units/1005$`));
});

test("an event is wishlisted from its Selected panel, and Only what I wishlisted keeps it @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  await page.request.post("/api/admin/payload", {
    data: { kind: "events", gameKey: "hsr", items: [{ key: "e2e-wish-me", name: "E2E event to wish", startsAt: iso(-1), endsAt: iso(4) }, { key: "e2e-not-me", name: "E2E event left out", startsAt: iso(-1), endsAt: iso(4) }] },
  });
  await page.request.put(`/api/instances/${id}/wishlist`, { data: { kind: "event", catalogId: "e2e-wish-me", wished: false } });

  await page.goto("/timeline?game=hsr");
  const timeline = page.getByRole("region", { name: "Timeline" });
  await timeline.getByRole("button", { name: /E2E event to wish/ }).click();
  const wish = page.getByRole("complementary", { name: "Selected" }).getByRole("button", { name: "Wishlist" });
  await wish.click();
  await expect(wish).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("checkbox", { name: "Only what I wishlisted" }).check();
  await expect(timeline.getByRole("button", { name: /E2E event to wish/ })).toBeVisible();
  await expect(timeline.getByRole("button", { name: /E2E event left out/ })).toHaveCount(0);
});
