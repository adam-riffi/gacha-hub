import { expect, test } from "@playwright/test";

test("the app uses its self-hosted type and the dark tokens @smoke", async ({ page }) => {
  const fontHosts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "font" || /fonts\.(googleapis|gstatic)\.com/.test(r.url())) fontHosts.push(new URL(r.url()).host);
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const look = await page.evaluate(async () => {
    const css = getComputedStyle(document.body);
    // Fonts load on first use, so ask for each face: an empty result means its file did not load.
    const faces = ['600 20px "Barlow Condensed"', '400 12px "IBM Plex Mono"', '400 15px "Hanken Grotesk"', '500 26px "Bodoni Moda"'];
    return {
      body: css.fontFamily,
      background: css.backgroundColor,
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().toLowerCase(),
      faces: await Promise.all(faces.map(async (f) => (await document.fonts.load(f)).length > 0)),
    };
  });
  expect(look.body).toContain("Hanken Grotesk");
  expect(look.background).toBe("rgb(5, 5, 5)");
  expect(look.accent).toBe("#ff2d95");
  expect(look.faces).toEqual([true, true, true, true]);
  expect(new Set(fontHosts)).toEqual(new Set([new URL(page.url()).host]));
});

test("deadlines within 48 hours are paper chips; view switches expose their state @smoke", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  // HSR, not Genshin: the smoke journey adds Genshin through the library.
  const { id } = (await (await page.request.post("/api/instances", { data: { gameKey: "hsr" } })).json()) as { id: string };
  const iso = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
  const upload = await page.request.post("/api/admin/payload", {
    data: {
      kind: "banners",
      gameKey: "hsr",
      items: [
        { key: "e2e-soon", name: "E2E ends soon", kind: "character", startsAt: iso(-24), endsAt: iso(10) },
        { key: "e2e-later", name: "E2E ends later", kind: "character", startsAt: iso(-24), endsAt: iso(24 * 9) },
      ],
    },
  });
  expect(upload.ok()).toBe(true);

  await page.goto("/?game=hsr");
  // The carousel shows the nearest deadline first, as a paper tag; the next banner is nine days out, a dark tag.
  const card = page.locator(".banner-card");
  await expect(card).toContainText("E2E ends soon");
  await expect(card.locator(".tag")).toHaveCSS("background-color", "rgb(237, 237, 237)");
  await expect(card).toHaveAttribute("data-rotating", "true");
  await card.getByRole("button", { name: "Next banner" }).click();
  await expect(card).toContainText("E2E ends later");
  await expect(card.locator(".tag")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  // The pointer over the card, or focus inside it, holds the rotation; reduced motion stops it.
  await expect(card).toHaveAttribute("data-rotating", "false");
  await card.getByRole("button", { name: "Next banner" }).blur();
  await page.mouse.move(0, 0);
  await expect(card).toHaveAttribute("data-rotating", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).toHaveAttribute("data-rotating", "false");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.goto(`/games/${id}/ownership`);
  const view = page.getByRole("group", { name: "Show" });
  await expect(view.getByRole("button", { name: /Characters/, pressed: true })).toBeVisible();
  await view.getByRole("button", { name: /Weapons/ }).click();
  await expect(view.getByRole("button", { name: /Weapons/, pressed: true })).toBeVisible();
  await expect(view.getByRole("button", { name: /Characters/, pressed: false })).toBeVisible();
});

