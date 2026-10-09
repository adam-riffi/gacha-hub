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

  const look = await page.evaluate(() => {
    const css = getComputedStyle(document.body);
    return {
      body: css.fontFamily,
      background: css.backgroundColor,
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().toLowerCase(),
      faces: ['600 20px "Barlow Condensed"', '400 12px "IBM Plex Mono"', '400 15px "Hanken Grotesk"'].map((f) => document.fonts.check(f)),
    };
  });
  expect(look.body).toContain("Hanken Grotesk");
  expect(look.background).toBe("rgb(5, 5, 5)");
  expect(look.accent).toBe("#ff2d95");
  expect(look.faces).toEqual([true, true, true]);
  expect(new Set(fontHosts)).toEqual(new Set([new URL(page.url()).host]));
});
