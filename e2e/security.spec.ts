import { expect, test } from "@playwright/test";

test("the app runs under its content security policy @smoke", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });

  const shell = await page.goto("/");
  expect(shell?.headers()["content-security-policy"]).toContain("script-src 'self'");
  await page.getByRole("button", { name: "Continue as Dev User" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  for (const path of ["/library", "/timeline", "/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("heading").first()).toBeVisible();
  }
  expect(violations).toEqual([]);
});
